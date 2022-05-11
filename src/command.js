import arg from "arg";
import inquirer from "inquirer";
const { exec } = require("child_process");

function argumentOptionsParser(rawArguments) {
  let args = arg(
    {},
    {
      argv: rawArguments.slice(2),
    }
  );
  return {
    search: args._[0],
  };
}

async function inquireUndeclaredItems(opts) {
  if (!opts.search) {
    console.log(
      "\x1b[31m%s\x1b[0m",
      "Please provide a string to search on. Example: ssm test-param"
    );
    return;
  }

  console.log("\x1b[33m%s\x1b[0m", "💬 Loading parameters...");
  exec(
    `aws ssm describe-parameters --parameter-filters Key=Name,Option=Contains,Values=${opts.search} | jq -r '.Parameters[].Name'`,
    async (error, stdout, stderr) => {
      if (error) {
        console.log("\x1b[31m%s\x1b[0m", `error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log("\x1b[31m%s\x1b[0m", `stderr: ${stderr}`);
        return;
      }

      const stringified = JSON.stringify(stdout);
      const parsedSTDOut = stringified
        .slice(1, stringified.length - 2)
        .replace(/\\n/g, "<br>")
        .replace(/\\/g, "")
        .split("<br>")
        .filter((i) => !!i);

      if (parsedSTDOut.length === 0) {
        console.log(
          "\x1b[33m%s\x1b[0m",
          `⚠️ No parameters could be found matching this search. (${opts.search})`
        );
        return null;
      }
      const displayOptions = [];

      displayOptions.push({
        type: "list",
        name: "template",
        message: "Which param do you need?",
        choices: parsedSTDOut,
        default: parsedSTDOut[0],
      });

      const userInput = await inquirer.prompt(displayOptions);
      console.log("\x1b[33m%s\x1b[0m", `💬 Finding ${userInput.template}...`);
      exec(
        `aws ssm get-parameter --with-decryption --name ${userInput.template} | jq '.Parameter'  | jq -r '.Value' | pbcopy`,
        (error, stdout, stderr) => {
          if (error) {
            console.log("\x1b[31m%s\x1b[0m", `error: ${error.message}`);
            return;
          }
          if (stderr) {
            console.log("\x1b[31m%s\x1b[0m", `stderr: ${stderr}`);
            return;
          }
          console.log(
            "\x1b[32m%s\x1b[0m",
            `✔ The value of ${userInput.template} is now on your clipboard!`
          );
        }
      );
      return {
        ...opts,
        template: opts.template || userInput.template,
      };
    }
  );
}
export async function interfaceCommand(args) {
  let opts = argumentOptionsParser(args);
  await inquireUndeclaredItems(opts);
  // console.log(opts);
}
