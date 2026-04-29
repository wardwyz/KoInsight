import { ActionIcon, Group, Loader, Table, Text, Title, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { JSX } from 'react';
import { mutate } from 'swr';
import { deleteLibraryBook, useLibraryBooks } from '../../api/books';

function formatBytes(size: number): string {
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function LibraryPage(): JSX.Element {
  const { data, isLoading, error } = useLibraryBooks();

  const openDeleteConfirm = (fileName: string) =>
    modals.openConfirmModal({
      title: '删除书籍文件？',
      centered: true,
      children: (
        <Text size="sm">
          确定要删除 <strong>{`"${fileName}"`}</strong> 吗？该操作不可撤销。
        </Text>
      ),
      labels: { confirm: '删除', cancel: '取消' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await deleteLibraryBook(fileName);
          await mutate(['books-library']);
          notifications.show({
            title: '文件已删除',
            message: `${fileName} 删除成功。`,
            color: 'green',
            position: 'top-center',
          });
        } catch {
          notifications.show({
            title: '删除失败',
            message: '删除书籍文件失败。',
            color: 'red',
            position: 'top-center',
          });
        }
      },
    });

  if (error) return <Text>加载书库失败</Text>;
  if (isLoading || !data) return <Loader />;

  return (
    <>
      <Title mb="xl">书库</Title>
      {data.length === 0 ? (
        <Text c="dimmed">books 文件夹中暂无书籍。</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>文件名</Table.Th>
              <Table.Th>格式</Table.Th>
              <Table.Th>大小</Table.Th>
              <Table.Th>修改时间</Table.Th>
              <Table.Th>操作</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((book) => (
              <Table.Tr key={book.fileName}>
                <Table.Td>{book.fileName}</Table.Td>
                <Table.Td>{book.extension.replace('.', '').toUpperCase()}</Table.Td>
                <Table.Td>{formatBytes(book.sizeBytes)}</Table.Td>
                <Table.Td>{new Date(book.modifiedAt).toLocaleString()}</Table.Td>
                <Table.Td>
                  <Group justify="center">
                    <Tooltip label="删除文件" withArrow>
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => openDeleteConfirm(book.fileName)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
