import React, { memo, useMemo } from 'react';

import { ChatItem } from '@/features/ChatList';
import { useChatStore } from '@/store/chat';
import { threadSelectors, topicSelectors } from '@/store/chat/selectors';

import ThreadDivider from './ThreadDivider';

export interface ThreadChatItemProps {
  id: string;
  index: number;
}

const ThreadChatItem = memo<ThreadChatItemProps>(({ id, index }) => {
  const [threadMessageId, threadStartMessageIndex, historyLength, lastSummarizedIndex] = useChatStore((s) => {
    const topic = topicSelectors.currentActiveTopic(s);
    return [
      threadSelectors.threadSourceMessageId(s),
      threadSelectors.threadSourceMessageIndex(s),
      threadSelectors.portalDisplayChatsLength(s),
      topic?.metadata?.lastSummarizedMessageIndex ?? 0,
    ];
  });

  const enableThreadDivider = threadMessageId === id;

  const endRender = useMemo(
    () => enableThreadDivider && <ThreadDivider />,
    [enableThreadDivider, id],
  );

  const isParentMessage = index <= threadStartMessageIndex;

  // Show history divider at the first message AFTER the last summarized message
  const enableHistoryDivider = lastSummarizedIndex > 0 && index === lastSummarizedIndex;

  return (
    <ChatItem
      disableEditing={isParentMessage}
      enableHistoryDivider={enableHistoryDivider}
      endRender={endRender}
      id={id}
      inPortalThread
      index={index}
    />
  );
});

ThreadChatItem.displayName = 'ThreadChatItem';

export default ThreadChatItem;
