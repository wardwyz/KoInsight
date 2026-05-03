import { Book, BookWithData } from '@koinsight/common/types';
import {
  Button,
  Checkbox,
  Flex,
  Group,
  Loader,
  Modal,
  Select,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useLocalStorage, useMediaQuery } from '@mantine/hooks';
import {
  IconArrowsDownUp,
  IconCards,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconTable,
  IconX,
} from '@tabler/icons-react';
import { JSX, useState } from 'react';
import { useBooks } from '../../api/books';
import { useProgresses } from '../../api/kosync';
import { EmptyState } from '../../components/empty-state/empty-state';
import { BooksCards } from './books-cards';
import { BooksTable } from './books-table';

import style from './books-page.module.css';

export function BooksPage(): JSX.Element {
  const media = useMediaQuery(`(max-width: 62em)`);

  const [mode, setMode] = useLocalStorage<'table' | 'cards'>({
    key: 'koinsight-books-search',
    defaultValue: 'table',
  });

  const [viewAdvancedFilters, { open: openAdvancedFilters, close: closeAdvancedFilters }] =
    useDisclosure(false);

  const [showHiddenBooks, setShowHiddenBooks] = useLocalStorage<boolean>({
    key: 'koinsight-hidden-books',
    defaultValue: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useLocalStorage<{
    key: keyof BookWithData;
    direction: 'asc' | 'desc';
  }>({
    key: 'koinsight-books-sort',
    defaultValue: {
      key: 'last_open',
      direction: 'desc',
    },
  });

  const { data: books, isLoading, error } = useBooks({ showHidden: showHiddenBooks });
  const { data: progresses } = useProgresses();

  const percentageByDocument = (progresses ?? []).reduce<
    Record<string, { percentage: number; updatedAt: number }>
  >((acc, progress) => {
    const updatedAt = new Date(progress.updated_at).getTime();
    const current = acc[progress.document];

    if (!current || updatedAt > current.updatedAt) {
      acc[progress.document] = {
        percentage: progress.percentage,
        updatedAt,
      };
    }

    return acc;
  }, {});

  const visibleBooks =
    searchTerm.length === 0
      ? (books ?? [])
      : (books ?? []).filter((book) =>
          [book.title, book.authors, book.series]
            .map((value) => value?.toLowerCase())
            .some((v) => v?.includes(searchTerm.toLowerCase()))
        );

  const sortedBooks = visibleBooks.sort((a, b) => {
    const { key: sort, direction } = sortBy;
    const aVal = a[sort];
    const bVal = b[sort];

    if (aVal === null) {
      return 1;
    }

    if (bVal === null) {
      return -1;
    }

    const dir = direction === 'asc' ? 1 : -1;
    if (aVal < bVal) {
      return -1 * dir;
    }
    if (aVal > bVal) {
      return 1 * dir;
    }

    return 0;
  });

  if (error) {
    return <Flex justify="center">加载书籍失败</Flex>;
  }

  if (isLoading || !books) {
    return (
      <Flex justify="center" align="center" h="100%">
        <Loader />
      </Flex>
    );
  }

  if (books.length === 0) {
    return (
      <>
        <Title mb="xl">书籍</Title>
        <EmptyState
          title="暂无书籍"
          description="看起来你还没有上传阅读统计数据。"
        />
      </>
    );
  }

  return (
    <>
      <Title mb="xl">书籍</Title>
      <div className={style.Controls}>
        <Flex gap="md">
          <TextInput
            placeholder="搜索书籍..."
            w={media ? '100%' : 300}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            rightSection={
              searchTerm.length > 0 ? (
                <IconX size={14} onClick={() => setSearchTerm('')} style={{ cursor: 'pointer' }} />
              ) : null
            }
          />
          <Tooltip label="高级筛选" openDelay={1000} position="top" withArrow>
            <Button variant="default" onClick={openAdvancedFilters}>
              <IconFilter size={14} />
            </Button>
          </Tooltip>
        </Flex>
        <Group align="center">
          <Tooltip
            openDelay={1000}
            label={`按${sortBy.direction === 'asc' ? '降序' : '升序'}排序`}
            position="top"
            withArrow
          >
            <Button
              variant="default"
              onClick={() =>
                setSortBy({
                  key: sortBy.key,
                  direction: sortBy.direction === 'asc' ? 'desc' : 'asc',
                })
              }
            >
              {sortBy.direction === 'asc' ? (
                <IconSortAscending size={18} />
              ) : (
                <IconSortDescending size={18} />
              )}
            </Button>
          </Tooltip>
          <Tooltip label="排序字段" openDelay={1000} position="top" withArrow>
            <Select
              leftSection={<IconArrowsDownUp size={16} />}
              w={150}
              value={sortBy.key}
              allowDeselect={false}
              onChange={(value) => setSortBy((prev) => ({ ...prev, key: value as keyof Book }))}
              data={
                [
                  { label: '添加时间', value: 'id' },
                  { label: '标题', value: 'title' },
                  { label: '作者', value: 'authors' },
                  { label: '阅读时长', value: 'total_read_time' },
                  { label: '最近打开', value: 'last_open' },
                ] as { label: string; value: keyof Book }[]
              }
              defaultValue="title"
            />
          </Tooltip>
          <Button.Group variant="default">
            <Tooltip label="表格视图" position="top" withArrow>
              <Button
                variant={mode === 'table' ? 'filled' : 'default'}
                onClick={() => setMode('table')}
              >
                <IconTable size={16} />
              </Button>
            </Tooltip>
            <Tooltip label="卡片视图" position="top" withArrow>
              <Button
                variant={mode === 'cards' ? 'filled' : 'default'}
                onClick={() => setMode('cards')}
              >
                <IconCards size={16} />
              </Button>
            </Tooltip>
          </Button.Group>
        </Group>
      </div>
      {mode === 'table' ? (
        <BooksTable books={sortedBooks} percentageByDocument={percentageByDocument} />
      ) : (
        <BooksCards books={sortedBooks} percentageByDocument={percentageByDocument} />
      )}
      <Modal
        opened={viewAdvancedFilters}
        onClose={closeAdvancedFilters}
        title="高级筛选"
        styles={{
          title: {
            fontSize: 'var(--mantine-font-size-xl)',
            fontWeight: 700,
            fontFamily: 'Noto Sans',
            paddingTop: 'var(--mantine-spacing-xs)',
          },
        }}
        radius="lg"
        centered
      >
        <Checkbox
          checked={showHiddenBooks}
          onChange={(v) => setShowHiddenBooks(v.target.checked)}
          label="显示隐藏书籍"
        />
      </Modal>
    </>
  );
}
