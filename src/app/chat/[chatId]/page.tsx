import Chat from "@/components/Chat";
import ChatSidebar from "@/components/ChatSidebar";
import PDFViewer from "@/components/PDFViewer";
import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";
import { checkSubscription } from "@/lib/subscription";
import { auth } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
  params: {
    chatId: string;
  };
};

const ChatPage = async ({ params: { chatId } }: Props) => {
  const { userId } = await auth();
  if (!userId) return redirect("/sign-in");
  const _chats = await db.select().from(chats).where(eq(chats.userId, userId));
  if (!_chats) {
    return redirect("/");
  }
  const currentChat = _chats.find((chat) => chat.id === parseInt(chatId));
  if (!currentChat) {
    return redirect("/");
  }
  const isPro = await checkSubscription(userId);

  return (
    <div className="flex max-h-screen overflow-scroll">
      <div className="flex w-full max-h-screen overflow-scroll">
        <div className="flex-[1] max-w-xs">
          <ChatSidebar chatId={parseInt(chatId)} chats={_chats} isPro={isPro} />
        </div>
        <div className="flex-[5] max-h-screen overflow-scroll p-4">
          <PDFViewer pdfUrl={currentChat.pdfUrl} />
        </div>
        <div className="flex-[3] border-l-4 border-l-slate-200">
          <Chat chatId={parseInt(chatId)} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
