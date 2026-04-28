import { ProgressWithUsername } from '@koinsight/common/types/progress';
import { Anchor, Card, Code, Flex, Progress, Title, Tooltip } from '@mantine/core';
import {
  IconCode,
  IconDeviceTablet,
  IconNote,
  IconPercentage,
  IconProgress,
  IconUser,
} from '@tabler/icons-react';
import { groupBy } from 'ramda';
import { useCallback, useMemo } from 'react';
import { generatePath, NavLink } from 'react-router';
import { useProgresses } from '../api/kosync';
import { useBooks } from '../api/books';
import { EmptyState } from '../components/empty-state/empty-state';
import { RoutePath } from '../routes';

export function SyncsPage() {
  const { data: progresses, isLoading } = useProgresses();
  const { data: books } = useBooks();

  const byDevice = useMemo(
    () => groupBy((progress: ProgressWithUsername) => progress.device_id)(progresses),
    [progresses]
  );

  const findBook = useCallback((md5: string) => books.find((book) => book.md5 === md5), [books]);

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <Title mb="sm">进度同步</Title>
      {progresses.length === 0 ? (
        <EmptyState
          title="暂无同步进度"
          description="目前还没有人同步阅读进度。"
        />
      ) : (
        <>
          {Object.entries(byDevice).map(([deviceId, progresses]) => (
            <div key={deviceId}>
              <Tooltip
                position="top-start"
                withArrow
                label={`设备 ID: ${progresses?.[0].device_id}`}
              >
                <Title order={3} mb="sm" mt="xl">
                  <Flex align="center" gap={4}>
                    <IconDeviceTablet /> {progresses?.[0].device}
                  </Flex>
                </Title>
              </Tooltip>

              <Flex gap="sm" wrap="wrap">
                {progresses?.map((progress) => (
                  <Card padding="lg" radius="md" withBorder>
                    <Flex direction="column" key={progress.id} gap="xs">
                      <Flex gap="xs" align="center">
                        <Tooltip withArrow label="用户名">
                          <IconUser size={18} />
                        </Tooltip>
                        <strong>{progress.username}</strong>
                      </Flex>
                      <Flex gap="xs" align="center">
                        <Tooltip withArrow label="文档">
                          <IconNote size={18} />
                        </Tooltip>
                        {findBook(progress.document) ? (
                          <>
                            <Anchor
                              component={NavLink}
                              to={generatePath(RoutePath.BOOK, {
                                id: findBook(progress.document)!.id.toString(),
                              })}
                            >
                              {findBook(progress.document)!.title}
                            </Anchor>
                            <Tooltip withArrow label={`MD5：${progress.document}`} position="top">
                              <IconCode size={18} />
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            MD5: <Code>{progress.document}</Code>
                          </>
                        )}
                      </Flex>
                      <Flex gap="xs" align="center">
                        <Tooltip withArrow label="进度">
                          <IconProgress size={18} />
                        </Tooltip>
                        <Code>{progress.progress}</Code>
                      </Flex>
                      <Flex gap="xs" align="center">
                        <Tooltip withArrow label="百分比">
                          <IconPercentage size={18} />
                        </Tooltip>
                        <Progress w="100" value={(progress.percentage * 100).toFixed(2)} />{' '}
                        {(progress.percentage * 100).toFixed(2)}%
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
