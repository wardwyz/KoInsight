import { Book } from '@koinsight/common/types';
import { Button, FileInput, Flex, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FormEvent, useState } from 'react';
import { mutate } from 'swr';
import { uploadBookCover } from '../../../api/books';

export type BookUploadCoverProps = {
  book: Book;
  showTitle?: boolean;
  onChange?: () => void;
};

export function BookUploadCover({ book, showTitle = true, onChange }: BookUploadCoverProps) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const onSuccess = async () => {
    // FIXME: this doesn't seem to work.
    await mutate('books');
    await mutate(`books/${book.id}`);
    notifications.show({
      title: '上传成功',
      message: '文件上传并校验成功。',
      position: 'top-center',
      color: 'green',
    });
    setMessage('封面已更新');
    onChange?.();
    close();
  };

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadBookCover(book.id, formData);

      if (response.ok) {
        await onSuccess();
      } else {
        setMessage('文件上传失败。');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  return (
    <div>
      {showTitle && (
        <Title order={3} mb="md">
          上传封面
        </Title>
      )}
      <form onSubmit={handleUpload} encType="multipart/form-data">
        <Flex align="flex-end" gap="md">
          <FileInput
            w={200}
            placeholder="cover.png"
            onChange={(e) => setFile(e)}
            accept=".png,.jpg,.jpeg,.gif"
          />
          <Button type="submit" color="violet" disabled={file === null}>
            上传
          </Button>
        </Flex>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}
