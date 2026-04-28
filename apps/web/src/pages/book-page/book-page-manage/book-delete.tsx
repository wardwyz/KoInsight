import { Book } from '@koinsight/common/types';
import { Button, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { mutate } from 'swr';
import { deleteBook } from '../../../api/books';
import { RoutePath } from '../../../routes';

export type BookDeleteProps = {
  book: Book;
};

export function BookDelete({ book }: BookDeleteProps) {
  const navigate = useNavigate();

  const [deleteLoading, setDeleteLoading] = useState(false);

  const openDeleteConfirm = () =>
    modals.openConfirmModal({
      title: '删除书籍？',
      centered: true,
      children: (
        <Text size="sm">
          确定要删除 <strong>{book ? `"${book?.title}"` : '这本书'}</strong> 吗？该操作不可撤销。
        </Text>
      ),
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: onDelete,
    });

  const onDelete = async () => {
    try {
      setDeleteLoading(true);
      await deleteBook(book.id);
      await mutate('books');
      navigate(RoutePath.HOME);
      notifications.show({
        title: '书籍已删除',
        message: `${book ? `"${book?.title}"` : '书籍'}删除成功。`,
        color: 'green',
        position: 'top-center',
      });
    } catch (error) {
      notifications.show({
        title: '删除书籍失败',
        message: '删除书籍失败。',
        color: 'red',
        position: 'top-center',
      });
    }
  };

  return (
    <div>
      <Title order={3} mb="md">
        删除书籍
      </Title>
      <Button
        loading={deleteLoading}
        leftSection={<IconTrash size={16} />}
        variant="danger"
        onClick={openDeleteConfirm}
      >
        删除书籍
      </Button>
    </div>
  );
}
