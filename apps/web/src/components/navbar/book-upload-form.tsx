import { Button, FileInput, Flex, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { FormEvent, JSX, useState } from 'react';
import { mutate } from 'swr';
import { uploadBookFile } from '../../api/books';

export function BookUploadForm(): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (files.length === 0) {
      setMessage('提交前请先选择文件。');
      return;
    }

    setLoading(true);
    const results = await Promise.allSettled(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await uploadBookFile(formData);
        if (!response.ok) {
          throw new Error(file.name);
        }
      })
    );
    setLoading(false);

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.length - successCount;
    if (successCount > 0) {
      await mutate('books');
      notifications.show({
        title: '上传成功',
        message: `成功上传 ${successCount} 本书${failCount > 0 ? `，失败 ${failCount} 本` : ''}。`,
        position: 'top-center',
        color: failCount > 0 ? 'yellow' : 'green',
      });
      setMessage('');
      setFiles([]);
      if (failCount === 0) {
        close();
      }
    } else {
      setMessage('文件上传失败。请检查文件格式（.epub/.pdf/.txt）。');
    }
  };

  return (
    <>
      <Button leftSection={<IconUpload size={16} />} onClick={open} variant="light" size="sm">
        上传书籍
      </Button>
      <Modal
        styles={{
          title: {
            fontSize: 'var(--mantine-font-size-xl)',
            fontWeight: 700,
            fontFamily: 'Noto Sans',
            paddingTop: 'var(--mantine-spacing-xs)',
          },
        }}
        title="上传书籍"
        opened={modalOpened}
        size="lg"
        onClose={close}
        radius="lg"
        centered
      >
        <Flex direction="column" gap="sm" mt="lg">
          <Text>上传你的电子书文件，支持批量上传（.epub、.pdf、.txt）。</Text>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <FileInput
              label="选择书籍文件"
              placeholder="可多选文件"
              onChange={(value) => setFiles(value ?? [])}
              value={files}
              multiple
              accept=".epub,.pdf,.txt"
              mb="sm"
            />
            <Button type="submit" loading={loading}>上传</Button>
          </form>
          {message && <p>{message}</p>}
        </Flex>
      </Modal>
    </>
  );
}
