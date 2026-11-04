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
    const rawToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || bot?.channel_access_token || '';
    const rawSecret = process.env.LINE_CHANNEL_SECRET || bot?.channel_secret || '';

    this.channelAccessToken = !rawToken.includes('demo') && !rawToken.includes('dummy') ? rawToken : '';
    this.channelSecret = !rawSecret.includes('demo') && !rawSecret.includes('dummy') ? rawSecret : '';
  }

  /**
   * Push message to a user or group
   */
  async pushMessage(to: string, messages: any[]): Promise<SendMessageResult> {
    if (!this.channelAccessToken) {
      console.warn(`[LINE CLIENT] Push message aborted: Channel Access Token belum dikonfigurasi.`);
      return {
        success: false,
        error: 'LINE Channel Access Token belum dikonfigurasi di menu Manajemen LINE Bot.',
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
        console.error(`[LINE CLIENT ERROR] Push failed (HTTP ${response.status}):`, errorBody);
        return {
          success: false,
          error: `LINE API Error ${response.status}: ${errorBody}`,
        };
      }

      const resJson = await response.json().catch(() => ({}));
      return {
        success: true,
        messageId: resJson.sentMessages?.[0]?.id || `line_msg_${Date.now()}`,
      };
    } catch (err: any) {
      console.error('[LINE CLIENT EXCEPTION] pushMessage:', err);
      return {
        success: false,
        error: err.message || 'Koneksi jaringan ke server LINE gagal',
      };
    }
  }

  /**
   * Reply to a webhook event replyToken
   */
  async replyMessage(replyToken: string, messages: any[]): Promise<SendMessageResult> {
    if (!this.channelAccessToken) {
      console.warn(`[LINE CLIENT] Reply message aborted: Channel Access Token belum dikonfigurasi.`);
      return {
        success: false,
        error: 'LINE Channel Access Token belum dikonfigurasi.',
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
        console.error(`[LINE CLIENT ERROR] Reply failed (HTTP ${response.status}):`, errorBody);
        return {
          success: false,
          error: `LINE API Error ${response.status}: ${errorBody}`,
        };
      }

      return { success: true };
    } catch (err: any) {
      console.error('[LINE CLIENT EXCEPTION] replyMessage:', err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Retrieves group summary information (name, picture) from LINE Messaging API
   */
  async getGroupSummary(groupId: string): Promise<{ groupId: string; groupName: string; pictureUrl?: string } | null> {
    if (!this.channelAccessToken || !groupId) return null;
    try {
      const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          groupId: data.groupId || groupId,
          groupName: data.groupName || '',
          pictureUrl: data.pictureUrl,
        };
      }
    } catch (err: any) {
      console.warn(`[LINE CLIENT] getGroupSummary warning for ${groupId}:`, err.message);
    }
    return null;
  }

  /**
   * Retrieves group member profile (displayName, pictureUrl) from LINE Messaging API
   */
  async getGroupMemberProfile(
    groupId: string,
    userId: string
  ): Promise<{ displayName: string; userId: string; pictureUrl?: string } | null> {
    if (!this.channelAccessToken || !groupId || !userId) return null;
    try {
      const response = await fetch(
        `https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/member/${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          displayName: data.displayName || '',
          userId: data.userId || userId,
          pictureUrl: data.pictureUrl,
        };
      }
    } catch (err: any) {
      console.warn(`[LINE CLIENT] getGroupMemberProfile warning for ${userId} in ${groupId}:`, err.message);
    }
    return null;
  }

  /**
   * Download binary content (image/video/file) from LINE Content API
   */
  async getMessageContent(messageId: string): Promise<Buffer | null> {
    if (!this.channelAccessToken || !messageId) return null;
    try {
      const response = await fetch(
        `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.channelAccessToken}`,
          },
        }
      );

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else {
        console.warn(`[LINE CLIENT] getMessageContent failed with HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.warn('[LINE CLIENT] getMessageContent exception:', err.message);
    }
    return null;
  }

  /**
   * Builds an interactive LINE Flex Message card for member registration confirmation
   */
  static buildRegistrationConfirmationFlex(data: {
    fullName: string;
    baptismalName?: string;
    lineId?: string;
    instagram?: string;
    classOrigin?: string;
    entryYear?: number;
    birthDate: number;
    birthMonth: number;
    birthYear?: number;
    whatsapp?: string;
    photoUrl: string;
  }) {
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    const monthStr = monthNames[(data.birthMonth || 1) - 1] || `${data.birthMonth}`;
    const birthStr = `${data.birthDate} ${monthStr} ${data.birthYear || ''}`.trim();

    const infoRows = [
      { label: '👤 Nama Lengkap', value: data.fullName },
      { label: '🕊️ Nama Baptis', value: data.baptismalName || '-' },
      { label: '💬 ID LINE', value: data.lineId || '-' },
      { label: '📸 Instagram', value: data.instagram ? `@${data.instagram.replace(/^@/, '')}` : '-' },
      { label: '🏫 Kelas', value: data.classOrigin || '-' },
      { label: '🎓 Angkatan', value: data.entryYear ? `${data.entryYear}` : '-' },
      { label: '🎂 Tgl Lahir', value: birthStr },
      { label: '📱 WhatsApp', value: data.whatsapp || '-' },
    ];

    const bodyContents: any[] = [
      {
        type: 'text',
        text: data.fullName,
        weight: 'bold',
        size: 'lg',
        color: '#111827',
      },
      {
        type: 'text',
        text: 'Calon Anggota Baru MP Community',
        size: 'xs',
        color: '#6B7280',
        margin: 'xs',
      },
      {
        type: 'separator',
        margin: 'md',
      },
      {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        spacing: 'sm',
        contents: infoRows.map((r) => ({
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: r.label,
              size: 'xs',
              color: '#4B5563',
              flex: 4,
            },
            {
              type: 'text',
              text: r.value,
              size: 'xs',
              color: '#111827',
              weight: 'bold',
              flex: 6,
              wrap: true,
            },
          ],
        })),
      },
    ];

    return {
      type: 'flex',
      altText: `Konfirmasi Pendaftaran: ${data.fullName}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#1E3A8A',
          paddingAll: 'lg',
          contents: [
            {
              type: 'text',
              text: '📋 KONFIRMASI DATA PENDAFTARAN',
              weight: 'bold',
              color: '#FFFFFF',
              size: 'sm',
            },
            {
              type: 'text',
              text: 'Pastikan seluruh data dan foto Anda sudah benar.',
              color: '#93C5FD',
              size: 'xs',
              margin: 'xs',
            },
          ],
        },
        hero: {
          type: 'image',
          url: data.photoUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: 'lg',
          contents: bodyContents,
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          paddingAll: 'lg',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#059669',
              height: 'sm',
              action: {
                type: 'message',
                label: '✅ Konfirmasi & Masuk Grup',
                text: '/konfirmasi_reg',
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              action: {
                type: 'message',
                label: '✏️ Batal / Ulangi',
                text: '/batal_reg',
              },
            },
          ],
        },
      },
    };
  }

  /**
   * Format Birthday Message with Native LINE Mention (textV2 API) or Text Fallback
   * PRD Requirement: Max 20 mentions per batch, no teddy bears.
   */
  formatBirthdayMentionMessage(members: Member[]): any {
    if (!members || members.length === 0) {
      return {
        type: 'text',
        text: 'Selamat ulang tahun untuk anggota komunitas MP yang berulang tahun hari ini! Tuhan memberkati.',
      };
    }

    // Build textV2 substitution object or fallback text mentions
    const substitution: LineTextV2Substitution = {};
    const mentionTokens: string[] = [];

    members.forEach((m, idx) => {
      const hasValidLineUserId = m.line_user_id && m.line_user_id.trim().startsWith('U');
      if (hasValidLineUserId) {
        const key = `user_${idx}`;
        mentionTokens.push(`{${key}}`);
        substitution[key] = {
          type: 'mention',
          mentionee: {
            type: 'user',
            userId: m.line_user_id!.trim(),
          },
        };
      } else {
        const fallbackName = m.line_id && m.line_id.startsWith('@')
          ? m.line_id
          : `@${m.full_name || m.nickname || 'Sahabat MP'}`;
        mentionTokens.push(fallbackName);
      }
    });

    const mentionListStr = mentionTokens.join(', ');
    const greetingHeader = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionListStr} !\n\n`;

    const messageBody = `Your birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.

"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."
— 𝙻𝚊𝚖𝒆𝚗𝚝𝒂𝚝𝚒𝚘𝚗𝚜 3:22-23`;

    const fullText = greetingHeader + messageBody;

    if (Object.keys(substitution).length > 0) {
      return {
        type: 'textV2',
        text: fullText,
        substitution,
      };
    }

    return {
      type: 'text',
      text: fullText,
    };
  }

  /**
   * Split members into batches of max 20 for LINE textV2 mention limits
   */
  static chunkMembersForMention(members: Member[], batchSize: number = 20): Member[][] {
    const batches: Member[][] = [];
    for (let i = 0; i < members.length; i += batchSize) {
      batches.push(members.slice(i, i + batchSize));
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

  /**
   * Build Birthday message batches respecting the max 20 mentions policy (PRD Section 5.6 & 5.7)
   */
  static buildBirthdayBatches(members: Member[]): Array<{
    batchNumber: number;
    formatType: 'full' | 'short';
    messagePayload: any;
    recipientCount: number;
    recipients: Member[];
  }> {
    const batches: Array<{
      batchNumber: number;
      formatType: 'full' | 'short';
      messagePayload: any;
      recipientCount: number;
      recipients: Member[];
    }> = [];

    const memberChunks = this.chunkMembersForMention(members, 20);

    memberChunks.forEach((batchMembers, i) => {
      const isFirstBatch = i === 0;
      const substitution: LineTextV2Substitution = {};
      const mentionTokens: string[] = [];

      batchMembers.forEach((m, idx) => {
        const hasValidLineUserId = m.line_user_id && m.line_user_id.trim().startsWith('U');
        if (hasValidLineUserId) {
          const tokenKey = `user_${i}_${idx}`;
          mentionTokens.push(`{${tokenKey}}`);
          substitution[tokenKey] = {
            type: 'mention',
            mentionee: {
              type: 'user',
              userId: m.line_user_id!.trim(),
            },
          };
        } else {
          // If no line_user_id, mention by display name or line_id directly in text!
          const cleanName = m.line_id && m.line_id.startsWith('@')
            ? m.line_id
            : `@${m.full_name || m.nickname || 'Sahabat MP'}`;
          mentionTokens.push(cleanName);
        }
      });

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
        textContent = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 ${mentionListStr} !\n\nYour birthday is a perfect reminder of this truth—that each day, and especially today, God’s love surrounds you, His grace renews you, and His mercies flow abundantly over your life. No matter what the past year held, His faithfulness has brought you through, and His promises are the foundation for all the joy and blessings awaiting you in the year ahead.\n\n"𝑻𝒉𝒆 𝒔𝒕𝒆𝒂𝒅𝒇𝒂𝒔𝒕 𝒍𝒐𝒗𝒆 𝒐𝒇 𝒕𝒉𝒆 𝑳𝒐𝒓𝒅 𝒏𝒆𝒗𝒆𝒓 𝒄𝒆𝒂𝒔𝒆𝒔; 𝑯𝒊𝒔 𝒎𝒆𝒓𝒄𝒊𝒆𝒔 𝒏𝒆𝒗𝒆𝒓 𝒄𝒐𝒎𝒆 𝒕𝒐 𝒂𝒏 𝒆𝒏𝒅; 𝒕𝒉𝒆𝒚 𝒂𝒓𝒆 𝒏𝒆𝒘 𝒆𝒗𝒆𝒓𝒚 𝒎𝒐𝒓𝒏𝒊𝒏𝒈."\n— 𝙻𝚊𝚖𝒆𝚗𝚝𝒂𝚝𝚒𝚘𝚗𝚜 3:22-23`;
      } else {
        textContent = `𝓱𝓪𝓹𝓹𝔂 𝓫𝓲𝓻𝓽𝓱𝓭𝓪𝔂 also to ${mentionListStr} !\n\nMay God bless you abundantly, fill your hearts with peace and guide your steps in this new age. Have a joyful celebration with MP Community! 🙏✨`;
      }

      const messagePayload: any = {
        text: textContent,
      };

      if (Object.keys(substitution).length > 0) {
        messagePayload.type = 'textV2';
        messagePayload.substitution = substitution;
      } else {
        messagePayload.type = 'text';
      }

      batches.push({
        batchNumber: i + 1,
        formatType: isFirstBatch ? 'full' : 'short',
        messagePayload,
        recipientCount: batchMembers.length,
        recipients: batchMembers,
      });
    });

    return batches;
  }
}
