import { getLineBotSync } from '../db/store';
import { Member } from '@/types';

export interface LineMentionee {
  type: 'user';
  userId: string;
}

export interface LineTextV2Substitution {
  [key: string]: {
    type: 'mention';
    mentionee: LineMentionee;
  };
}

export interface LineMessagePayload {
  to: string; // group_id or user_id
  messages: any[];
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mockDelivered?: boolean;
}

export class LineApiClient {
  private channelAccessToken: string;
  private channelSecret: string;

  constructor() {
    const bot = getLineBotSync();
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || bot.channel_access_token;
    this.channelSecret = process.env.LINE_CHANNEL_SECRET || bot.channel_secret;
  }

  /**
   * Push message to a user or group
   */
  async pushMessage(to: string, messages: any[]): Promise<SendMessageResult> {
    // If running in development with dummy token or no credentials, simulate delivery gracefully
    if (
      !this.channelAccessToken ||
      this.channelAccessToken.includes('dummy') ||
      process.env.NODE_ENV === 'development'
    ) {
      console.log(`[LINE CLIENT SIMULATION] Push message to: ${to}`, JSON.stringify(messages, null, 2));
      return {
        success: true,
        messageId: `sim_msg_${Date.now()}`,
        mockDelivered: true,
      };
    }

    try {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to,
          messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[LINE CLIENT ERROR] Failed to push message:', errorBody);
        return {
          success: false,
          error: `LINE API error: ${response.status} - ${errorBody}`,
        };
      }

      const data = await response.json().catch(() => ({}));
      return {
        success: true,
        messageId: data.sentMessages?.[0]?.id || `msg_${Date.now()}`,
      };
    } catch (err: any) {
      console.error('[LINE CLIENT ERROR] Exception sending message:', err);
      return {
        success: false,
        error: err.message || 'Unknown network error',
      };
    }
  }

  /**
   * Reply to a personal 1-on-1 chat
   */
  async replyMessage(replyToken: string, messages: any[]): Promise<SendMessageResult> {
    if (
      !this.channelAccessToken ||
      this.channelAccessToken.includes('dummy') ||
      process.env.NODE_ENV === 'development'
    ) {
      console.log(`[LINE CLIENT SIMULATION] Reply to token: ${replyToken}`, JSON.stringify(messages, null, 2));
      return {
        success: true,
        mockDelivered: true,
      };
    }

    try {
      const response = await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: `LINE API error: ${response.status} - ${errorBody}`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Build Birthday message batches respecting the max 20 mentions policy (PRD Section 5.6 & 5.7)
   *
   * Template Requirement:
   * Message 1: Full template + Lamentations 3:22-23 quote + first <=20 mentions.
   * Message 2+: Short greeting format for remaining mentions.
   * NO TEDDY BEAR EMOJI 🧸!
   */
  static buildBirthdayBatches(members: Member[]): {
    batchNumber: number;
    formatType: 'full' | 'short';
    messagePayload: any;
    recipientCount: number;
    recipients: Member[];
  }[] {
    if (!members || members.length === 0) return [];

    const BATCH_SIZE = 20;
    const batches = [];
    const totalBatches = Math.ceil(members.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
      const batchMembers = members.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const isFirstBatch = i === 0;

      // Construct textV2 substitution structure
      const substitution: LineTextV2Substitution = {};
      const mentionTokens: string[] = [];

      batchMembers.forEach((m, idx) => {
        const tokenKey = `user_${i}_${idx}`;
        mentionTokens.push(`{${tokenKey}}`);
        substitution[tokenKey] = {
          type: 'mention',
          mentionee: {
            type: 'user',
            userId: m.line_user_id || `U_MOCK_${m.id}`,
          },
        };
      });

      // Construct formatted mention list: "@A, @B and @C"
      let mentionListStr = '';
      if (mentionTokens.length === 1) {
        mentionListStr = mentionTokens[0];
      } else if (mentionTokens.length === 2) {
        mentionListStr = `${mentionTokens[0]} and ${mentionTokens[1]}`;
      } else {
        const allButLast = mentionTokens.slice(0, -1).join(', ');
        const last = mentionTokens[mentionTokens.length - 1];
        mentionListStr = `${allButLast} and ${last}`;
      }

      let textContent = '';
      if (isFirstBatch) {
        // Full official PRD template (PRD Section 5.6)
        textContent = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionListStr} !\n\nYour birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.\n\n"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."\n— 𝙻𝚊𝚖𝚎𝚗𝚝𝚊𝚝𝚒𝚘𝚗𝚜 3:22-23`;
      } else {
        // Short greeting format for secondary batches (PRD Section 5.7)
        textContent = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 also to ${mentionListStr} !\n\nMay God bless you abundantly, fill your hearts with peace and guide your steps in this new age. Have a joyful celebration with MP Community! 🙏✨`;
      }

      // LINE textV2 message structure with native mentions
      const messagePayload = {
        type: 'textV2',
        text: textContent,
        substitution,
      };

      batches.push({
        batchNumber: i + 1,
        formatType: isFirstBatch ? ('full' as const) : ('short' as const),
        messagePayload,
        recipientCount: batchMembers.length,
        recipients: batchMembers,
      });
    }

    return batches;
  }

  /**
   * Build Daily Devotional Message in Coffee Break with God template
   */
  static buildDevotionalMessage(formattedContent: string) {
    return {
      type: 'text',
      text: formattedContent,
    };
  }
}
