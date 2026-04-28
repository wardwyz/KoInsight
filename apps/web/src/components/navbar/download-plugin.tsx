import { Button, Flex, Modal, ModalProps, Stack, Text, Title } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { JSX } from 'react';

export type DownloadPluginModalProps = Pick<ModalProps, 'opened' | 'onClose'>;

export function DownloadPluginModal({ opened, onClose }: DownloadPluginModalProps): JSX.Element {
  return (
    <Modal
      title="下载 KOReader 插件"
      styles={{
        title: {
          fontSize: 'var(--mantine-font-size-xl)',
          fontWeight: 700,
          fontFamily: 'Noto Sans',
          paddingTop: 'var(--mantine-spacing-xs)',
        },
      }}
      opened={opened}
      onClose={onClose}
      size="lg"
      radius="lg"
      centered
    >
      <Flex direction="column" gap="sm" align="flex-start">
        <Flex align="center" gap="lg">
          <IconDownload size={150} />
          <Stack>
            <Text>
              下载适用于 KOReader 的 KoInsight 插件压缩包，用于将你的阅读统计同步到 KoInsight。
            </Text>
            <Text>
              安装时请将压缩包内容解压到设备上的 KOReader plugins 目录。
            </Text>
          </Stack>
        </Flex>

        <Button component="a" href="/api/plugin/download" leftSection={<IconDownload size={16} />}>
          下载 KOReader 插件
        </Button>
      </Flex>
    </Modal>
  );
}
