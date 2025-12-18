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
  const [threadMessageId, threadStartMessageIndex, , lastSummarizedMessageId] = useChatStore((s) => {
    const topic = topicSelectors.currentActiveTopic(s);
    return [
      threadSelectors.threadSourceMessageId(s),
      threadSelectors.threadSourceMessageIndex(s),
      threadSelectors.portalDisplayChatsLength(s),
      topic?.metadata?.lastSummarizedMessageId as string | undefined,
    ];
  });

  const enableThreadDivider = threadMessageId === id;

  const endRender = useMemo(
    () => enableThreadDivider && <ThreadDivider />,
    [enableThreadDivider, id],
  );

  const isParentMessage = index <= threadStartMessageIndex;

  // Show history divider when the current message ID matches the first unsummarized message ID
  const enableHistoryDivider = !!lastSummarizedMessageId && id === lastSummarizedMessageId;

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
