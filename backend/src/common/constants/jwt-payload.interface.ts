export interface IJwtPayload {
    sessionId: string;
    /** Encrypted subpage config UUID */
    su: string;
    /** Encrypted subscription shortUuid of the user that opened the page */
    uid?: string;
}
