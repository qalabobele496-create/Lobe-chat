import { createStyles } from 'antd-style';
import React, { memo } from 'react';

import { ChatItem } from '@/features/ChatList';
import { useAgentStore } from '@/store/agent';
import { agentChatConfigSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { displayMessageSelectors, threadSelectors, topicSelectors } from '@/store/chat/selectors';

import SupervisorThinkingTag from './OrchestratorThinking';
import Thread from './Thread';

const useStyles = createStyles(({ css, token, isDarkMode }) => {
  const borderColor = isDarkMode ? token.colorFillSecondary : token.colorFillTertiary;

  return {
    end: css`
      &::after {
        inset-inline-end: 36px;
        border-inline-end: 2px solid ${borderColor};
        border-end-end-radius: 8px;
      }
    `,
    line: css`
      &::after {
        content: '';

        position: absolute;
        inset-block-end: 60px;

        width: 38px;
        height: 53px;
        border-block-end: 2px solid ${borderColor};
      }
    `,
    start: css`
      &::after {
        inset-inline-start: 30px;
        border-inline-start: 2px solid ${borderColor};
        border-end-start-radius: 8px;
      }
    `,
  };
});

export interface ThreadChatItemProps {
  id: string;
  index: number;
}

const MainChatItem = memo<ThreadChatItemProps>(({ id, index }) => {
  const { styles, cx } = useStyles();

  // Get showThread, historyLength, and lastSummarizedMessageId from chat store
  const [showThread, historyLength, lastSummarizedMessageId] = useChatStore((s) => {
    const topic = topicSelectors.currentActiveTopic(s);
    return [
      threadSelectors.hasThreadBySourceMsgId(id)(s),
      displayMessageSelectors.mainDisplayChatIDs(s).length,
      topic?.metadata?.lastSummarizedMessageId as string | undefined,
    ];
  });

  const displayMode = useAgentStore(agentChatConfigSelectors.displayMode);

  // Show history divider when the current message ID matches the first unsummarized message ID
  // The divider appears BEFORE this message (which is the first one after the summarized content)
  const enableHistoryDivider = !!lastSummarizedMessageId && id === lastSummarizedMessageId;

  const userRole = useChatStore((s) => displayMessageSelectors.getDisplayMessageById(id)(s)?.role);

  const placement = displayMode === 'chat' && userRole === 'user' ? 'end' : 'start';

  const isLatestItem = historyLength === index + 1;

  return (
    <>
      <ChatItem
        className={showThread ? cx(styles.line, styles[placement]) : ''}
        enableHistoryDivider={enableHistoryDivider}
        endRender={showThread && <Thread id={id} placement={placement} />}
        id={id}
        index={index}
        isLatestItem={isLatestItem}
      />
      {isLatestItem && <SupervisorThinkingTag />}
    </>
  );
});

export default MainChatItem;
