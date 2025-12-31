import { prisma } from "../lib/prisma.ts";


export class ChatService {

    async createConversation(userId: string, title: string, mode:string="chat") {
        return await prisma.conversations.create({
            data: {
                userId,
                title: title || "New Conversation",
                mode,
            },
            include:{
                messages: true
            }
        })
    }


    async getorCreateConversations(userId: string, conversationId?: string, mode: string = "chat") {
        if (conversationId) {
            const conversation = await prisma.conversations.findFirst({
                where: {
                    id: conversationId,
                    userId
                },
                include: {
                    messages: {
                        orderBy: {
                            createdAt: 'asc'
                        }
                    }
                }
            });
            if (conversation) return conversation;
        }

        return await this.createConversation(userId, "New Conversation", mode);
    }


    async addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string) {
        if (!content || !content.trim()) {
            throw new Error("Message content cannot be empty");
        }
        
        const safeContent = typeof content === 'string' ? content.trim() : JSON.stringify(content);
        
        return await prisma.messages.create({
            data: {
                conversationId,
                role,
                content: safeContent,
            }
        });
    }


    async getMessages(conversationId: string) {
        const msgs = await prisma.messages.findMany({
            where: {
                conversationId
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        return msgs.map((msg) => ({
            ...msg,
            content: msg.content.trim(),
        }));
    }

    async getConversationsByUser(userId: string) {
        return await prisma.conversations.findMany({
            where: {
                userId
            },
            orderBy: {
                updatedAt: 'desc'
            },
            include: {
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })
    }

    async deleteConversation(conversationId: string, userId: string) {
        return await prisma.conversations.deleteMany({
            where: {
                id: conversationId,
                userId
            }
        })
    }

   async updateConversationTitle(conversationId: string, title: string, userId: string) {
        return await prisma.conversations.updateMany({
            where: {
                id: conversationId,
                userId: userId 
            },
            data: {
                title
            }
        });
    }

    formatMessagesForModel(messages: Array<{ role: string, content: string }>): any[] {
        return messages.map(msg => {
            const role = (msg.role === 'user' || msg.role === 'system' || msg.role === 'assistant') 
                ? msg.role 
                : 'user';

            return {
                role: role,
                content: typeof msg.content === "string" ? msg.content.trim() : JSON.stringify(msg.content),
            } as any;
        });
    }
}