'use client';

import { Form, type FormGroupItemType, ImageSelect, SliderWithInput, TextArea } from '@lobehub/ui';
import { Button, Switch, Space, App } from 'antd';
import { useThemeMode } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { LayoutList, MessagesSquare, Trash2, RefreshCw } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { imageUrl } from '@/const/url';
import { useChatStore } from '@/store/chat';

import { selectors, useStore } from '../store';

const AgentChat = memo(() => {
  const { t } = useTranslation('setting');
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { isDarkMode } = useThemeMode();
  const updateConfig = useStore((s) => s.setChatConfig);
  const config = useStore(selectors.currentChatConfig, isEqual);

  const [clearingLoading, setClearingLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const clearHistorySummary = useChatStore((s) => s.clearHistorySummary);
  const triggerManualSummary = useChatStore((s) => s.triggerManualSummary);

  const handleClearSummary = async () => {
    setClearingLoading(true);
    try {
      await clearHistorySummary();
      message.success(t('settingChat.summaryClear.success'));
    } catch {
      message.error(t('settingChat.summaryClear.error'));
    } finally {
      setClearingLoading(false);
    }
  };

  const handleManualSummary = async () => {
    setSummaryLoading(true);
    try {
      await triggerManualSummary();
      message.success(t('settingChat.summaryManual.success'));
    } catch {
      message.error(t('settingChat.summaryManual.error'));
    } finally {
      setSummaryLoading(false);
    }
  };

  const chat: FormGroupItemType = {
    children: [
      {
        children: (
          <ImageSelect
            height={86}
            options={[
              {
                icon: MessagesSquare,
                img: imageUrl(`chatmode_chat_${isDarkMode ? 'dark' : 'light'}.webp`),
                label: t('settingChat.chatStyleType.type.chat'),
                value: 'chat',
              },
              {
                icon: LayoutList,
                img: imageUrl(`chatmode_docs_${isDarkMode ? 'dark' : 'light'}.webp`),
                label: t('settingChat.chatStyleType.type.docs'),
                value: 'docs',
              },
            ]}
            style={{
              marginRight: 2,
            }}
            unoptimized={false}
            width={144}
          />
        ),
        label: t('settingChat.chatStyleType.title'),
        minWidth: undefined,
        name: 'displayMode',
      },
      {
        children: <TextArea placeholder={t('settingChat.inputTemplate.placeholder')} />,
        desc: t('settingChat.inputTemplate.desc'),
        label: t('settingChat.inputTemplate.title'),
        name: 'inputTemplate',
      },
      {
        children: <Switch />,
        desc: t('settingChat.enableAutoCreateTopic.desc'),
        label: t('settingChat.enableAutoCreateTopic.title'),
        layout: 'horizontal',
        minWidth: undefined,
        name: 'enableAutoCreateTopic',
        valuePropName: 'checked',
      },
      {
        children: <SliderWithInput max={8} min={0} unlimitedInput={true} />,
        desc: t('settingChat.autoCreateTopicThreshold.desc'),
        divider: false,
        hidden: !config.enableAutoCreateTopic,
        label: t('settingChat.autoCreateTopicThreshold.title'),
        name: 'autoCreateTopicThreshold',
      },
      {
        children: <Switch />,
        label: t('settingChat.enableHistoryCount.title'),
        layout: 'horizontal',
        minWidth: undefined,
        name: 'enableHistoryCount',
        valuePropName: 'checked',
      },
      {
        children: <SliderWithInput max={20} min={0} unlimitedInput={true} />,
        desc: t('settingChat.historyCount.desc'),
        divider: false,
        hidden: !config.enableHistoryCount,
        label: t('settingChat.historyCount.title'),
        name: 'historyCount',
      },
      {
        children: <Switch />,
        hidden: !config.enableHistoryCount,
        label: t('settingChat.enableCompressHistory.title'),
        layout: 'horizontal',
        minWidth: undefined,
        name: 'enableCompressHistory',
        valuePropName: 'checked',
      },
      {
        children: (
          <Space>
            <Button
              danger
              icon={<Trash2 size={14} />}
              loading={clearingLoading}
              onClick={handleClearSummary}
              size="small"
            >
              {t('settingChat.summaryClear.button')}
            </Button>
            <Button
              icon={<RefreshCw size={14} />}
              loading={summaryLoading}
              onClick={handleManualSummary}
              size="small"
              type="primary"
            >
              {t('settingChat.summaryManual.button')}
            </Button>
          </Space>
        ),
        desc: t('settingChat.summaryActions.desc'),
        hidden: !config.enableHistoryCount || !config.enableCompressHistory,
        label: t('settingChat.summaryActions.title'),
        minWidth: undefined,
      },
    ],
    title: t('settingChat.title'),
  };

  return (
    <Form
      footer={
        <Form.SubmitFooter
          texts={{
            reset: t('submitFooter.reset'),
            submit: t('settingChat.submit'),
            unSaved: t('submitFooter.unSaved'),
            unSavedWarning: t('submitFooter.unSavedWarning'),
          }}
        />
      }
      form={form}
      initialValues={config}
      items={[chat]}
      itemsType={'group'}
      onFinish={updateConfig}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default AgentChat;

