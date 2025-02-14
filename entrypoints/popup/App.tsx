import { useState, useEffect } from "react";
import reactLogo from "@/assets/react.svg";
import wxtLogo from "/wxt.svg";
import { sendMessage, onMessage } from "webext-bridge/popup";
import {
    DetailedEmailMessage,
    EmailAccount,
    MessageAttachment,
} from "@/components/types";
import {
    Copy,
    RefreshCw,
    Mail,
    ArrowLeft,
    Loader,
    Loader2,
    Check,
} from "lucide-react";

function App() {
    const [count, setCount] = useState(0);
    const [EmailAccount, setEmailAccount] = useState<EmailAccount | null>(null);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
    const [addressCopied, setAddressCopied] = useState(false);

    useEffect(() => {
        const fetchEmail = async () => {
            const response = (await sendMessage(
                "fetch-email",
                null
            )) as EmailAccount | null;
            console.log("Message from background:", response);
            setEmailAccount(response);
            if (response === null) {
                console.log("REQUESTING EMAIL");
                setLoadingEmail(true);
                const createResponse = (await sendMessage(
                    "create-email",
                    null
                )) as EmailAccount | null;
                console.log("Email Account:", createResponse);
                setEmailAccount(createResponse);
                setLoadingEmail(false);
            } else {
                // fetch messages
                const messages = (await sendMessage("fetch-messages", null)) as
                    | EmailAccount["messages"]
                    | null;
                if (messages) {
                    setEmailAccount((prev) => {
                        if (prev) {
                            return { ...prev, messages };
                        }
                        return prev;
                    });
                }
            }
        };
        fetchEmail();

        onMessage("new-messages", async (msg) => {
            console.log("NEW MESSAGES", msg);
            const messages = msg.data as unknown as EmailAccount["messages"];
            setEmailAccount((prev) => {
                if (prev) {
                    return { ...prev, messages };
                }
                return prev;
            });
        });


    }, []);

    async function handleNewEmail() {
        setLoadingEmail(true);
        const response = (await sendMessage("new-email", null)) as {
            account?: EmailAccount;
            error?: string;
        };
        if (!response.error && response.account) {
            setEmailAccount(response.account);
        }

        setLoadingEmail(false);
    }

    return (
        <>
            <div className="min-w-[20rem] bg-white shadow-2xl overflow-hidden border border-purple-100">
                <div className="bg-purple-600 text-white p-4 flex items-center justify-between rounded-b-xl gap-2">
                    <div
                        className="flex items-center space-x-2 cursor-pointer hover:bg-purple-700 p-2 rounded-lg transition"
                        onClick={() => {
                            if (EmailAccount)
                                navigator.clipboard.writeText(
                                    EmailAccount.address
                                );
                            setAddressCopied(true);
                            setTimeout(() => setAddressCopied(false), 2000);
                        }}
                    >
                        <Mail className="text-white" size={20} />
                        {loadingEmail ? (
                            <span className="font-medium text-sm">
                                Loading...
                            </span>
                        ) : (
                            <>
                                <span className="font-medium text-sm">
                                    {EmailAccount?.address}
                                </span>
                                <Copy
                                    size={18}
                                    style={{
                                        color: addressCopied
                                            ? "#2ecc71"
                                            : "white",
                                    }}
                                    className="transition"
                                />
                            </>
                        )}
                    </div>
                    <button
                        className="bg-purple-500 hover:bg-purple-700 p-2 rounded-full transition cursor-pointer"
                        onClick={handleNewEmail}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                <div className="divide-y divide-purple-100 min-h-72">
                    {selectedMessage ? (
                        <EmailDetailsPage messageId={selectedMessage} />
                    ) : EmailAccount?.messages?.length ? (
                        <div>
                            {EmailAccount.messages.map((message) => (
                                <MessageListCard
                                    key={message.id}
                                    message={message}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center min-h-72">
                            <span className="text-[1rem]">No messages yet</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );

    function MessageListCard({ message }: { message: EmailMessage }) {
        return (
            <div
                className="p-2 m-1 cursor-pointer hover:bg-purple-100 transition border-purple-500 border-2 rounded-md"
                onClick={() => setSelectedMessage(message.id)}
            >
                <div className="flex items-center justify-between flex-row">
                    <span className="font-medium">{message.from.name}</span>
                    <span className="text-xs text-gray-500">
                        {new Date(message.receivedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>
                <span className="text-sm">{message.from.address}</span>
                <br />
                <span className="text-sm font-semibold overflow-ellipsis overflow-hidden line-clamp-2">
                    Subject: {message.subject}
                </span>
            </div>
        );
    }

    function EmailDetailsPage({ messageId }: { messageId: string }) {
        const [dMessage, setDMessage] = useState<DetailedEmailMessage | null>(
            null
        );

        useEffect(() => {
            const fetchMessage = async () => {
                const response = (await sendMessage(
                    "fetch-message",
                    messageId
                )) as DetailedEmailMessage | null;
                setDMessage(response);
            };
            fetchMessage();
        }, []);

        return (
            <div>
                {dMessage ? (
                    <div className="p-2">
                        <button
                            onClick={() => setSelectedMessage(null)}
                            className="bg-purple-300 p-2 rounded-lg transition hover:bg-purple-400 mb-2 cursor-pointer flex flex-row gap-2"
                        >
                            <ArrowLeft size={16} />
                            Return to messages
                        </button>
                        <div className="rounded-md bg-purple-100 p-2">
                            <span className="font-semibold">
                                From: {dMessage.from.name}
                            </span>
                            <span className="text-sm text-gray-500">
                                {" "}
                                [{dMessage.from.address}]
                            </span>
                            <br />
                            <span className="font-semibold">
                                Subject: {dMessage.subject}
                            </span>
                        </div>
                        <div className="border-purple-100 border-2 rounded-md p-2 mt-2">
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: dMessage.html,
                                }}
                            />
                        </div>
                        {dMessage.attachments.length !== 0 && (
                            <div className="mt-2">
                                <span className="font-bold mb-1">
                                    Attachments:
                                </span>
                                <div className="flex flex-row gap-2 flex-wrap">
                                    {dMessage.attachments.map((attachment) => (
                                        <AttachmentItem
                                            key={attachment.id}
                                            attachment={attachment}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center min-h-72">
                        <Loader2
                            size={40}
                            className="animate-spin text-gray-400"
                        />
                    </div>
                )}
            </div>
        );
    }

    function AttachmentItem({ attachment }: { attachment: MessageAttachment }) {
        async function downloadAttachment() {
            console.log("Downloading attachment:", attachment.downloadUrl);
            const res = await fetch(attachment.downloadUrl, {
                headers: {
                    Authorization: `Bearer ${EmailAccount?.token}`,
                },
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        return (
            <div
                className="px-2 py-1 border-2 border-purple-200 rounded-md cursor-pointer hover:bg-purple-100 transition flex"
                onClick={downloadAttachment}
            >
                <span className="">
                    {attachment.filename.length > 20
                        ? attachment.filename.slice(0, 20) + "..."
                        : attachment.filename}
                </span>
            </div>
        );
    }
}

export default App;
