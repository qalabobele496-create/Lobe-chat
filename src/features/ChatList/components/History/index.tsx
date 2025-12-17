import { ModelTag } from '@lobehub/icons';
import { Icon, Markdown, Text } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ScrollText } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { agentChatConfigSelectors } from '@/store/agent/selectors';
import { useAgentStore } from '@/store/agent/store';
import { useChatStore } from '@/store/chat';
import { topicSelectors } from '@/store/chat/selectors';

import HistoryDivider from './HistoryDivider';

// Same delimiter used in memory.ts for separating summaries
const SUMMARY_DELIMITER = '\n\n---\n\n';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    padding-inline: 12px;
    border-radius: 12px;
  `,
  content: css`
    color: ${token.colorTextDescription};
  `,
  line: css`
    width: 3px;
    height: 100%;
    background: ${token.colorBorder};
  `,
  summaryCard: css`
    margin-bottom: 16px;
    padding: 8px 12px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorder};
    border-radius: 8px;
  `,
  summaryLabel: css`
    font-size: 12px;
    font-weight: 600;
    color: ${token.colorPrimary};
  `,
}));

const History = memo(() => {
  const { styles, theme } = useStyles();
  const { t } = useTranslation('chat');
  const [content, model] = useChatStore((s) => {
    const history = topicSelectors.currentActiveTopicSummary(s);
    return [history?.content, history?.model];
  });

  const enableCompressHistory = useAgentStore(
    (s) => agentChatConfigSelectors.currentChatConfig(s).enableCompressHistory,
  );

  // Split content into individual summaries (S1, S2, S3...)
  const summaries = useMemo(() => {
    if (!content) return [];
    return content.split(SUMMARY_DELIMITER).filter((s) => s.trim().length > 0);
  }, [content]);

  return (
    <Flexbox paddingInline={16} style={{ paddingBottom: 8 }}>
      <HistoryDivider enable />
      {enableCompressHistory && summaries.length > 0 && (
        <Flexbox className={styles.container} gap={8}>
          <Flexbox align={'flex-start'} gap={8} horizontal>
            <Center height={20} width={20}>
              <Icon icon={ScrollText} size={16} style={{ color: theme.colorTextDescription }} />
            </Center>
            <Text type={'secondary'}>{t('historySummary')}</Text>
            {model && (
              <div>
                <ModelTag model={model} />
              </div>
            )}
          </Flexbox>
          {/* Render each summary as a separate card */}
          {summaries.map((summary, index) => (
            <Flexbox key={index} className={styles.summaryCard} gap={4}>
              <Text className={styles.summaryLabel}>
                S{index + 1}
              </Text>
              <Markdown className={styles.content} variant={'chat'}>
                {summary}
              </Markdown>
            </Flexbox>
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
});

export default History;
