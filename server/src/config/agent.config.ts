import chalk from "chalk";
import { AIService } from "../cli/ai/service.ts";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import path from "path";
import { existsSync, promises as fs } from 'fs'
import z from "zod";

const IntentSchema = z.object({
  intent: z.enum(["create", "modify", "other"]).describe("User's intention"),
  reason: z.string().describe("Short reason for the classification"),
});

const ApplicationSchema = z.object({
    folderName: z.string().describe("Name of the application folder"),
    description: z.string().describe("Breif description of the application").optional(),
    files: z.array(z.object({
        path: z.string().describe("Relative path from application root ex: src/index.js"),
        content: z.string().describe("Complete content of the file"),
    })).describe("List of files to be created in the application"),
    setupCommands: z.array(z.string()).describe("Commands to setup the application environment (ex: npm install)").optional(),
    runCommand: z.string().describe("Command to run the application (ex: node src/index.js or npm run dev)"),
    dependencies: z.array(z.object({
        name: z.string(),
        version: z.string().optional()
    })).optional().describe("List of dependencies (if any)"),
})

const ModificationSchema = z.object({
  targetFolder: z.string().describe("Target folder name (or '.' for current dir)"),
  explanation: z.string().describe("Summary of changes made"),
  files: z.array(z.object({
      path: z.string().describe("File path relative to target folder"),
      content: z.string().optional().describe("New content (required for create/update)"),
      action: z.enum(['create', 'update', 'delete']).describe("Action to perform")
  })).describe("List of file modifications")
})


// function displayFileTree(folderName: string, files: Array<{ path: string, content: string }>): string {
//     let tree = `${folderName}/\n`;
//     const fileMap: Record<string, any> = {};

//     files.forEach(file => {
//         const parts = file.path.split('/');
//         let current = fileMap;

//         parts.forEach((part, index) => {
//             if (!current[part]) {
//                 current[part] = (index === parts.length - 1) ? null : {};
//             }
//             current = current[part] || {};
//         });
//     });

//     function buildTree(obj: Record<string, any>, prefix: string) {
//         const entries = Object.entries(obj);
//         entries.forEach(([key, value], index) => {
//             const isLast = index === entries.length - 1;
//             tree += `${prefix}${isLast ? '└── ' : '├── '}${key}\n`;
//             if (value) {
//                 buildTree(value, prefix + (isLast ? '    ' : '│   '));
//             }
//         });
//     }

//     buildTree(fileMap, '');
//     return tree;
// }

function displayFileTree(
  folderName: string,
  files: Array<{ path: string; content: string }>
): string {
  const root = {} as Record<string, any>;

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      if (!node[part]) {
        node[part] = isLeaf ? true : {};
      }
      if (!isLeaf) node = node[part];
    }
  }

  let tree = `${folderName}/\n`;
  function build(node: Record<string, any> | boolean, prefix = "") {
    if (node === true) return;
    const entries = Object.entries(node as Record<string, any>);
    entries.forEach(([key, value], idx) => {
      const isLast = idx === entries.length - 1;
      tree += `${prefix}${isLast ? "└── " : "├── "}${key}\n`;
      if (value !== true) {
        build(value, prefix + (isLast ? "    " : "│   "));
      }
    });
  }

  build(root, "");
  return tree;
}

const aiService = new AIService();

// FILE OPERATIONS

async function createApplicationFiles(baseDir: string, files: Array<{ path: string, content: string }>, folderName: string) {

    if (!folderName || folderName === "/" || folderName === ".") {
      throw new Error("Invalid folder name");
    }

    if (path.isAbsolute(folderName)) {
      throw new Error("folderName must be a relative name, not an absolute path");
    }
    if (folderName.includes("..")) {
      throw new Error("folderName must not contain '..'");
    }

    const appDir = path.resolve(baseDir, folderName);

    await fs.mkdir(appDir, { recursive: true });
    console.log(chalk.yellow(`Created Folder: ${folderName}/`))

    for (const file of files) {
        const fullFilePath = path.resolve(appDir, file.path);

        if (!fullFilePath.startsWith(appDir)) {
             console.warn(chalk.red(`⚠ Security Warning: Skipped file trying to escape directory: ${file.path}`));
             continue;
        }
        const dirPath = path.dirname(fullFilePath);
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(fullFilePath, file.content, 'utf-8');
    
    }

    return appDir;

}


async function modifyApplicationFiles(
  baseDir: string,
  modifications: z.infer<typeof ModificationSchema>
) {
  const targetPath = path.resolve(baseDir, modifications.targetFolder);


  if (!targetPath.startsWith(path.resolve(baseDir))) {
    throw new Error(`Security Error: Cannot modify files outside ${baseDir}`);
  }

  if (!existsSync(targetPath)) {
    throw new Error(
      `Target folder '${modifications.targetFolder}' does not exist.`
    );
  }

  console.log(
    chalk.yellow(`\nApplying modifications to: ${modifications.targetFolder}/`)
  );

  for (const file of modifications.files) {
    const filePath = path.join(targetPath, file.path);

    if (!filePath.startsWith(targetPath)) continue;

    if (file.action === "delete") {
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log(chalk.red(` 🗑️ Deleted: ${file.path}`));
      }
    } 
    else {
      if (file.content) {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content, "utf-8");
        const icon = file.action === "create" ? "✨" : "📝";
        console.log(
          chalk.green(
            ` ${icon} ${file.action === "create" ? "Created" : "Updated"}: ${
              file.path
            }`
          )
        );
      }
    }
  }
  return targetPath;
}


// MAIN FUNCTION TO GENERATE APPLICATION STRUCTURE


export async function routeUserIntent({userInput,history}: {userInput:string,history?: Array<{role:string,content:string}>}) {
  console.log(chalk.blue('\nAnalyzing User Intent...'));
  const conversationHistory = history ? history.map(h=>`${h.role}: ${h.content}`).join('\n') : 'No prior conversation history.';

  try {
    const { output: intentOutput } = await generateText({
      model: aiService.model,
      output: Output.object({
        schema: IntentSchema,
        description: "Classified user intent based on the input",
      }),
      prompt: `
        User's Conversation History: ${conversationHistory}
        You are an expert AI assistant that classifies user intent into one of the following categories: 'create', 'modify', or 'other'.
        User Input: ${userInput}
        If the user request involves creating a new application structure or files, classify it as 'create'.
        If the user request involves modifying existing application files or structure, classify it as 'modify'.
        If the user refers to "it", "the app", or "that project", look at history to see if it implies a modification to a previous creation.
        For any other requests that do not involve creating or modifying application structures, classify it as 'other'.
        Provide a brief reason for your classification.`,
    });

     return intentOutput;
    
  } catch (error) {

    console.log(chalk.red('Error analyzing user intent:'), error);
    throw error;
    
  }

}


export async function generateApplicationStructurePrompt({description,location=process.cwd()}:{description:string,location?:string}) {

    console.log(chalk.blue('\n Agent Mode: Generating your Application'))
    console.log(chalk.blue(`Request: ${description}`))

    const PROMPT = `
    You are an expert software developer. Your task is to create a complete production ready application structure based on the user's request.
    User description: ${description}
    Here are the IMPORTANT requirements:
    1. The application should be created in a folder named appropriately to the application purpose.
    2. Create all necessary files and folders required for the application to run.
    3. Each file should have complete content with proper code, comments, and structure.
    4. Include a brief description of the application.
    5. List any setup commands required to install dependencies or prepare the environment if required.
    6. Provide the commands or steps to run the application.
    7. List all dependencies required by the application in key-value pairs if required.
    8. Include README.md and config files (like .gitignore,.env) as necessary.
    9. Ensure the application is production ready with proper structure and best practices.`

    try {

        const { output:application } = await generateText({
            model: aiService.model,
            output:Output.object({
                schema: ApplicationSchema,
                description: "The structure of the application to be created based on the user's request",
            }),
            prompt: `${PROMPT}\nProvide the response in the specified JSON format only.`,
         })
        
        console.log('\nApplication Name:', chalk.cyan(application.folderName))

        if(application.files.length === 0){
            console.log(chalk.red('Error: No files were generated for the application.'))
            return;
        }

        console.log(chalk.green('\n Generated Application Structure:'))
        const tree = displayFileTree(application.folderName, application.files);
        console.log(chalk.yellow(tree));

        const appDir = await createApplicationFiles(location, application.files, application.folderName);
        console.log(chalk.green(`\nApplication files created successfully at: ${appDir}\n`));

        return {application, appDir, type: 'create',tree};
        
    } catch (error) {
        
        console.log(chalk.red('Error generating application structure:'), error);
        throw error;
    }

}

type HistoryType = {
  role: string;
  content: string;
}


export async function modifyApplicationStructurePrompt({description,location=process.cwd(),history}:
{description:string,location?:string,history?: Array<HistoryType>}) {

    console.log(chalk.blue('\n Agent Mode: Modifying your Application'))
    console.log(chalk.blue(`Request: ${description}`))

    const conversationHistory = history ? `${history.map(h=>`${h.role}: ${h.content}`).join('\n')}` : 'No prior conversation history.';

    const PROMPT = `
    You are an expert software developer. Your task is to modify existing application files based on the user's request.
    Current Working Directory: ${location}
    Recent Conversation History: ${conversationHistory}
    User description: ${description}
    Here are the IMPORTANT requirements:
    1. Identify the target folder to apply modifications (use '.' for current directory).
    2. If the user request refers to previous applications in history, use that context to determine what needs to be modified.If no context is found, assume modifications are to be made in the current directory, otherwise modify the target folder as specified by the user.
    3. Specify the changes needed for each file: create, update, or delete.
    4. For 'create' and 'update' actions, provide the complete new content of the file.
    5. Ensure all modifications align with best practices and maintain application integrity.`

    try {
      
      const { output:modifications } = await generateText({
          model: aiService.model,
          output:Output.object({
              schema: ModificationSchema,
              description: "The modifications to be made to the existing application based on the user's request",
          }),
          prompt: `${PROMPT}\nProvide the response in the specified JSON format only.`,
       })

       console.log(chalk.cyan(`\n Plan: ${modifications.explanation}`));

       const targetDir = await modifyApplicationFiles(location, modifications);
       console.log(chalk.green(`\nApplication files modified successfully at: ${targetDir}\n`));

        return {modifications, targetDir, type: 'modify'};
      
    } catch (error) {
       console.log(chalk.red("Error modifing application structure:"), error);
       throw error;
    }

}
