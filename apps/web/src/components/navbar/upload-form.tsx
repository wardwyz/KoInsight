import { Button, FileInput, Flex, Modal, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { FormEvent, JSX, useState } from 'react';
import { uploadDbFile } from '../../api/upload-db-file';
import { mutate } from 'swr';

export function UploadForm(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setMessage('提交前请先选择文件。');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await uploadDbFile(formData);

      if (response.ok) {
        // FIXME: this doesn't seem to work.
        await mutate('books');
        notifications.show({
          title: '上传成功',
          message: '文件上传并校验成功。',
          position: 'top-center',
          color: 'green',
        });
        setMessage('');
        close();
      }
      else if (response.status === 413) {
        const body = await response.json();
        setMessage(body?.error);
      } else {
        setMessage('文件上传失败。');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  return (
    <>
      <Button leftSection={<IconUpload size={16} />} onClick={open} variant="light" size="sm">
        上传统计
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
        title="上传 KOReader 统计数据库"
        opened={modalOpened}
        size="lg"
        onClose={close}
        radius="lg"
        centered
      >
        <Flex direction="column" gap="sm" mt="lg">
          <Text>上传你的 KOReader statistics.sqlite3 文件。</Text>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <FileInput
              label="选择数据库文件"
              placeholder="statistics.sqlite3"
              onChange={(e) => setFile(e)}
              accept=".sqlite,.sqlite3"
              mb="sm"
            />
            <Button type="submit">上传</Button>
          </form>
          {message && <p>{message}</p>}
        </Flex>
      </Modal>
    </>
  );
}
