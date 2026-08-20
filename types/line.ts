// ==========================================
// LINE BOT & WEBHOOK TYPES
// ==========================================

export interface LineWebhookEvent {
    type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'postback';
    mode?: string;
    timestamp: number;
    source: {
        type: 'user' | 'group' | 'room';
        userId?: string;
        groupId?: string;
        roomId?: string;
    };
    replyToken?: string;
    message?: {
        id: string;
        type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
        text?: string;
    };
    postback?: {
        data: string;
        params?: Record<string, string>;
    };
}

export interface LineWebhookPayload {
    destination?: string;
    events: LineWebhookEvent[];
}

export type LineMessage =
    | {
          type: 'text';
          text: string;
          quickReply?: LineQuickReply;
      }
    | {
          type: 'flex';
          altText: string;
          contents: LineFlexContainer;
          quickReply?: LineQuickReply;
      };

export interface LineQuickReply {
    items: Array<{
        type: 'action';
        action: {
            type: 'message' | 'postback';
            label: string;
            text?: string;
            data?: string;
            displayText?: string;
        };
    }>;
}

export type LineFlexContainer =
    | LineFlexBubble
    | LineFlexCarousel;

export interface LineFlexCarousel {
    type: 'carousel';
    contents: LineFlexBubble[];
}

export interface LineFlexBubble {
    type: 'bubble';
    size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
    direction?: 'ltr' | 'rtl';
    header?: LineFlexBox;
    hero?: LineFlexComponent;
    body?: LineFlexBox;
    footer?: LineFlexBox;
    styles?: Record<string, unknown>;
}

export type LineFlexComponent =
    | LineFlexBox
    | LineFlexText
    | LineFlexButton
    | LineFlexSeparator
    | LineFlexSpacer
    | LineFlexImage;

export interface LineFlexBox {
    type: 'box';
    layout: 'horizontal' | 'vertical' | 'baseline';
    contents: LineFlexComponent[];
    flex?: number;
    spacing?: string;
    margin?: string;
    paddingAll?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingStart?: string;
    paddingEnd?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: string;
    cornerRadius?: string;
    justifyContent?: string;
    alignItems?: string;
    action?: LineFlexAction;
}

export interface LineFlexText {
    type: 'text';
    text: string;
    flex?: number;
    margin?: string;
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
    align?: 'start' | 'center' | 'end';
    gravity?: 'top' | 'center' | 'bottom';
    weight?: 'regular' | 'bold';
    color?: string;
    wrap?: boolean;
    maxLines?: number;
    decoration?: 'none' | 'underline' | 'line-through';
}

export interface LineFlexButton {
    type: 'button';
    action: LineFlexAction;
    flex?: number;
    margin?: string;
    height?: 'sm' | 'md';
    style?: 'link' | 'primary' | 'secondary';
    color?: string;
}

export interface LineFlexSeparator {
    type: 'separator';
    margin?: string;
    color?: string;
}

export interface LineFlexSpacer {
    type: 'spacer';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export interface LineFlexImage {
    type: 'image';
    url: string;
    flex?: number;
    margin?: string;
    align?: 'start' | 'center' | 'end';
    size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl' | 'full';
    aspectRatio?: string;
    aspectMode?: 'cover' | 'fit';
}

export interface LineFlexAction {
    type: 'uri' | 'message' | 'postback';
    label?: string;
    uri?: string;
    text?: string;
    data?: string;
    displayText?: string;
}

// ==========================================
// AI INTENT & ACTION TYPES
// ==========================================

export type AiActionType =
    | 'add_todo'
    | 'list_todos'
    | 'complete_todo'
    | 'delete_todo'
    | 'add_expense'
    | 'list_expenses'
    | 'get_summary'
    | 'get_weather'
    | 'link_account'
    | 'help'
    | 'general_chat';

export interface AiIntentResult {
    action: AiActionType;
    confidence: number;
    todo?: {
        title: string;
        priority?: 'low' | 'medium' | 'high';
        due_date?: string; // YYYY-MM-DD
        category?: string;
    };
    complete_todo?: {
        keyword: string;
    };
    expense?: {
        amount: number;
        type: 'expense' | 'income';
        category?: string;
        note?: string;
    };
    link_account?: {
        email?: string;
    };
    chat_response?: string;
}
