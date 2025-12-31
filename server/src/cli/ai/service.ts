import chalk from "chalk";
import { ai_config } from "../../config/ai.config.ts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { stepCountIs, streamText, type Tool, type ModelMessage } from "ai";


export class AIService {
    model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
    constructor() {
        if(!ai_config.google_api_key){
            console.log(chalk.red("Missing API key"));
            throw new Error("Missing API key");
        }
        const google = createGoogleGenerativeAI({
            apiKey: ai_config.google_api_key,

        })
        
        this.model = google("gemini-2.5-flash")
    }

    async sendMessage(
        messages: ModelMessage[], 
        onChunk: (chunk: string) => void, 
        tools: Record<string, Tool> = {},
        onToolCall: (toolName: string, toolArgs: any) => void = () => {})  {
        try {

            const result = streamText({
                model: this.model,
                messages:messages,
                tools: Object.keys(tools).length > 0 ? tools : undefined,
                maxRetries: 3,
                temperature: 0.7,
                stopWhen:stepCountIs(5),
                onStepFinish:  (event) => {
                    if (event.toolCalls?.length) {
                      console.log(
                        chalk.yellow(
                          `🛠️  Executing ${event.toolCalls.length} tool(s)...`
                        )
                      );
                    }
                }
            })

            if(Object.keys(tools).length > 0) {
                console.log(`DEBUG:Tools enabled: ${Object.keys(tools).join(",")}`)
            }

            let fullResponse = "";

            for await (const textPart of result.textStream) {
                fullResponse+=textPart;
                if(onChunk){
                    onChunk(textPart);
                }
            //   console.log(textPart);
            }

            const toolCalls: Array<{toolName: string, toolArgs: any}> = [];
            const toolResults: Array<{toolName: string, toolResult: any}> = [];

            if(result.steps && Array.isArray(result.steps)) {
                for (const step of result.steps) {
                    if(step.toolCalls && step.toolCalls.length > 0) {
                        for (const toolCall of step.toolCalls) {
                            toolCalls.push({
                                toolName: toolCall.toolName,
                                toolArgs: toolCall.toolArgs
                            });

                            if(onToolCall){
                                onToolCall(toolCall.toolName, toolCall.toolArgs);
                            }
                        }
                    }

                    if(step.toolResults && step.toolResults.length > 0) {
                        for (const toolResult of step.toolResults) {
                            toolResults.push({
                                toolName: toolResult.toolName,
                                toolResult: toolResult.toolResult,
                            });
                        }
                    }
                }
            }

            return {
                content:fullResponse,
                finishResponse:await result.finishReason,
                usage:await result.usage,
                toolCalls,
                toolResults,
                steps: result.steps
            }


        } catch (error) {
            console.error(chalk.red("Error in sendMessage:"), error);
            throw error;
        }
    }

    
    async getMessage(messages:Array<any>,tools: Record<string, any> = {}) {
        let fullResponse="";
        const result = await this.sendMessage(messages,(chunk)=>{
            fullResponse+=chunk;
        },tools);

        return result.content;
    }
}