import { google } from "@ai-sdk/google";
import { type Tool } from "ai";
import chalk from "chalk";


export const availableTools = [
  {
    id: "google_search",
    name: "Google Search",
    description: "Access the latest information using google search",
    getTools: () => google.tools.googleSearch({}),
    enabled: false,
  },
  {
    id: "url_context",
    name: "URL Context",
    description:
      "Provide specific URL, to let assitant directly access contents from the site.",
    getTools: () => google.tools.urlContext({}),
    enabled: false,
  },
  {
    id: "code_executer",
    name: "Code Execution",
    description:
      "A tool that enables the model to generate and run Python code",
    getTools: () => google.tools.codeExecution({}),
    enabled: false,
  },
  {
    id: "google_map",
    name: "Google Map",
    description: "Access geographical information using Google Maps",
    getTools: () => google.tools.googleMaps({}),
    enabled: false,
  },
  // {
  //   id: "file_search",
  //   name: "File Search",
  //   description: "Search any context from your files",
  //   geTools: ( files:string[] ) => google.tools.fileSearch({
  //     fileSearchStoreNames: files,
  //     topK: 3,
  //   }),
  //   enabled: false,
  // }
];


export function getEnabledTools() {
    const tools: Record<string, Tool> = {};

    try {

      for(const toolConfig of availableTools) {
        if(toolConfig.enabled) {

          tools[toolConfig.id] = toolConfig.getTools();
        }
      }
      if(Object.keys(tools).length > 0) {
        console.log(`Enabled tools: ${Object.keys(tools).join(',')}`)
      }

      return tools;
        
    } catch (error) {

      console.error("Error getting enabled tools:", error);
      return tools;
        
    }
}


export function toogleTool(toolId: string) {

  const tool = availableTools.find(t => t.id === toolId);

  if(tool) {
    tool.enabled = !tool.enabled;
    console.log(`Tool ${tool.name} is now ${tool.enabled ? 'enabled' : 'disabled'}`);
  } else {
    console.log(chalk.yellow(`Tool with id ${toolId} not found`));
  }
}


export function enableTool(toolIds: string[]) {

  availableTools.forEach(tool => {
    if(toolIds.includes(tool.id)) {
      tool.enabled = true;
      console.log(`Tool ${tool.name} enabled`);
    }
  });

  const enabledToolCount = availableTools.filter(t => t.enabled).length;
  console.log(`${enabledToolCount} tool(s) enabled.`);
}


export function getEnabledToolNames() {
  const names = availableTools.filter(t => t.enabled).map(t => t.name);
  console.log(`Enabled tool names: ${names.join(',')}`);
  return names;
}

export function resetTools() {
  for(const tool of availableTools) {
    tool.enabled = false;
  }
  console.log("All tools have been reset to disabled.");
}