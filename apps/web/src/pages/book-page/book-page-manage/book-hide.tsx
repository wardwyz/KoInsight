import { Book } from '@koinsight/common/types';
import { Switch, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mutate } from 'swr';
import { hideBook, showBook } from '../../../api/books';
import { RoutePath } from '../../../routes';

export type BookHideProps = {
  book: Book;
};

export function BookHide({ book }: BookHideProps) {
  const navigate = useNavigate();

  const [hideLoading, setHideLoading] = useState(false);

  const onUpdate = async (hidden: boolean) => {
    try {
      setHideLoading(true);

      if (hidden) {
        await hideBook(book.id);
      } else {
        await showBook(book.id);
      }

      await mutate('books');
      await mutate(`books/${book.id}`);

      if (hidden) {
        navigate(RoutePath.HOME);
      }

      notifications.show({
        title: hidden ? '书籍已隐藏' : '书籍已显示',
        message: `${book ? `"${book?.title}"` : '书籍'}${hidden ? '已隐藏' : '已显示'}。`,
        color: 'green',
        position: 'top-center',
      });
    } catch (error) {
      notifications.show({
        title: hidden ? '隐藏书籍失败' : '显示书籍失败',
        message: hidden ? '隐藏书籍失败。' : '显示书籍失败。',
        color: 'red',
        position: 'top-center',
      });
    } finally {
      setHideLoading(false);
    }
  };

  return (
    <div>
      <Title order={3} mb="md">
        隐藏书籍
      </Title>
      <Text size="sm" mb="md" lh="xl">
        隐藏后该书不会出现在书单中，也不会计入统计数据。
      </Text>
      <Switch
        disabled={hideLoading}
        label="隐藏书籍"
        checked={book.soft_deleted}
        onChange={(e) => onUpdate(e.target.checked)}
      ></Switch>
    </div>
  );
}
