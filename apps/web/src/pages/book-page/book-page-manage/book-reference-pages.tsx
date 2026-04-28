import { Book } from '@koinsight/common/types';
import { Button, Flex, NumberInput, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { updateBookReferencePages } from '../../../api/books';

export type BookReferencePagesProps = {
  book: Book;
};

export function BookReferencePages({ book }: BookReferencePagesProps) {
  const [referencePages, setReferencePages] = useState(book.reference_pages ?? 0);

  const [updateLoading, setUpdateLoading] = useState(false);

  const onUpdateReferencePages = async () => {
    try {
      setUpdateLoading(true);
      await updateBookReferencePages(book.id, referencePages);
      notifications.show({
        title: '参考页数已更新',
        message: `${book ? `"${book?.title}"` : '书籍'} 的参考页数更新成功。`,
        color: 'green',
        position: 'top-center',
      });
    } catch (error) {
      notifications.show({
        title: '更新参考页数失败',
        message: '',
        color: 'red',
        position: 'top-center',
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div>
      <Title order={3} mb="md">
        参考页数
      </Title>
      <Text size="sm" mb="md" maw="80%" lh="xl">
        KOReader 基于<em>应用内分页</em>记录阅读进度，这会受到字体大小、边距和排版等设置影响。
        例如一本 100 页的书，在字体变大后可能会显示为 150 页。
        <br />
        <br />
        为了获得更准确的统计，你可以设置<strong>参考页数</strong>（纸书或原版的真实页数）。
        KoInsight 会按这个页数换算阅读统计。
      </Text>
      <Flex gap="md">
        <NumberInput
          min={0}
          value={referencePages}
          onChange={(e) => setReferencePages(Number(e))}
        />
        <Button variant="subtle" loading={updateLoading} onClick={onUpdateReferencePages}>
          更新参考页数
        </Button>
      </Flex>
    </div>
  );
}
