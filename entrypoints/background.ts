import { DetailedEmailMessage, EmailAccount } from "../components/types";
import { onMessage, sendMessage } from "webext-bridge/background";
import sanitizeHtml from "sanitize-html";


export default defineBackground(() => {
    let EMAIL_DOMAIN: null | string = null;

    (async () => {
        if (!EMAIL_DOMAIN) await getDomains();
    })();

    async function getDomains() {
        const res = await fetch("https://api.mail.gw/domains");
        const domainRes = await res.json();
        const domains = domainRes["hydra:member"].map((domain: any) => ({
            id: domain.id,
            domain: domain.domain,
        }));
        EMAIL_DOMAIN = domains[Math.floor(Math.random() * domains.length)].domain;
        console.log("EMAIL_DOMAIN", EMAIL_DOMAIN);
    }

    async function createTempEmail() {
        if (!EMAIL_DOMAIN) await getDomains();
        const password = Math.random().toString(36).slice(2, 12);
        const name = Math.random().toString(36).slice(2, 12);
        const address = `${name}@${EMAIL_DOMAIN}`;

        const accountRes = await fetch("https://api.mail.gw/accounts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                address,
                password,
            }),
        });
        const account = await accountRes.json();
        const jwtRes = await fetch("https://api.mail.gw/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                address,
                password,
            }),
        });
        const jwt = await jwtRes.json();
        return {
            id: account.id,
            address,
            password,
            token: jwt.token,
            createdAt: account.createdAt,
            messages: [],
        };
    }

    async function deleteTempEmail(
        id: EmailAccount["id"],
        token: EmailAccount["token"]
    ) {
        if (!EmailAccount) return;
        await fetch(`https://api.mail.gw/accounts/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    async function fetchMessages() {
        if (!EmailAccount) return;
        const res = await fetch("https://api.mail.gw/messages", {
            headers: {
                Authorization: `Bearer ${EmailAccount.token}`,
            },
        });
        const messageRes = await res.json();
        const messages = messageRes["hydra:member"].map((message: any) => ({
            id: message.id,
            from: message.from,
            subject: message.subject,
            receivedAt: message.createdAt,
        })) as EmailMessage[];
        return messages;
    }

    async function fetchMessage(messageId: string) {
        if (!EmailAccount) return;
        const res = await fetch(`https://api.mail.gw/messages/${messageId}`, {
            headers: {
                Authorization: `Bearer ${EmailAccount.token}`,
            },
        });
        const message = await res.json();
        console.log(message);
        return {
            id: message.id,
            from: message.from,
            subject: message.subject,
            receivedAt: message.createdAt,
            html:
                "<div>" +
                message.html
                    .map((html: any) =>
                        sanitizeHtml(html, {
                            allowedTags:
                                sanitizeHtml.defaults.allowedTags.concat([
                                    "img",
                                    "a",
                                ]),
                            allowedAttributes: {
                                ...sanitizeHtml.defaults.allowedAttributes,
                                img: ["src", "alt"],
                                a: ["href", "target"],
                            },
                            transformTags: {
                                a: sanitizeHtml.simpleTransform("a", {
                                    target: "_blank",
                                }),
                            },
                        })
                    )
                    .join("") +
                "</div>",
            attachments: message.attachments.map((attachment: any) => ({
                id: attachment.id,
                filename: attachment.filename,
                contentType: attachment.contentType,
                downloadUrl: `https://api.mail.gw/${attachment.downloadUrl}`,
                size: attachment.size,
            })),
        } as DetailedEmailMessage;
    }

    // create an account

    let EmailAccount: EmailAccount | null = null;

    onMessage("fetch-email", async () => {
        return EmailAccount;
    });

    onMessage("create-email", async () => {
        EmailAccount = await createTempEmail();
        return EmailAccount;
    });

    onMessage("new-email", async () => {
        try {
            if (EmailAccount)
                deleteTempEmail(EmailAccount.id, EmailAccount.token);

            EmailAccount = await createTempEmail();
        } catch (error: any) {
            return { error: error?.message };
        }
        return { account: EmailAccount };
    });

    onMessage("fetch-messages", async () => {
        if (!EmailAccount) return null;
        const messages = await fetchMessages();
        if (messages) EmailAccount.messages = messages;
        return EmailAccount.messages;
    });

    onMessage(
        "fetch-message",
        async ({ data: messageId }: { data: string }) => {
            if (!EmailAccount) return null;
            const test = await fetchMessage(messageId);
            console.log("))))))))))))))))))))", test);
            return fetchMessage(messageId);
        }
    );

    // show a notification when the extension is loaded

    setInterval(async () => {
        if (!EmailAccount) return;
        const messages = await fetchMessages();
        if (messages) {
            if (messages.length > EmailAccount.messages.length) {
                const newMessage = messages[0];
                const not = browser.notifications.create({
                    type: "basic",
                    iconUrl: browser.runtime.getURL("/icons/128.png"),
                    title: `Received Email from ${newMessage.from.name}`,
                    message: newMessage.subject,
                    isClickable: true,
                    // requireInteraction: true,
                });

                browser.notifications.onClicked.addListener(() => {
                    console.log("NOTIFICATION clicked");
                });

                try {
                    sendMessage("new-messages", messages as any, "popup");
                } catch (error) {
                    console.log("Could not send messages to popup script");
                }
            }
            EmailAccount.messages = messages;
        }
    }, 10000);
    // setInterval(() => sendMessage("new-messages", {test: "abc"}, "popup"), 1000)
});
