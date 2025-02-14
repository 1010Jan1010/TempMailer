export interface EmailAccount {
    id: string;
    address: string;
    password: string;
    token: string;
    createdAt: string;
    messages: EmailMessage[];
}

export interface EmailMessage {
    id: string;
    from: { address: string; name: string };
    subject: string;
    receivedAt: string;
}

export interface DetailedEmailMessage extends EmailMessage {
    html: string;
    attachments: MessageAttachment[];
}

export interface MessageAttachment {
    id: string;
    filename: string;
    contentType: string;
    downloadUrl: string;
    size: number;
}