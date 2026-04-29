import { Loader, Table, Text, Title } from '@mantine/core';
import { JSX } from 'react';
import { useLibraryBooks } from '../../api/books';

function formatBytes(size: number): string {
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function LibraryPage(): JSX.Element {
  const { data, isLoading, error } = useLibraryBooks();

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
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((book) => (
              <Table.Tr key={book.fileName}>
                <Table.Td>{book.fileName}</Table.Td>
                <Table.Td>{book.extension.replace('.', '').toUpperCase()}</Table.Td>
                <Table.Td>{formatBytes(book.sizeBytes)}</Table.Td>
                <Table.Td>{new Date(book.modifiedAt).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
