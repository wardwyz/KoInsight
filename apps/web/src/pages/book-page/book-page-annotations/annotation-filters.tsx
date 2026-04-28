import { Checkbox, Flex, Group, Select, Stack, TextInput, Tooltip } from '@mantine/core';
import { IconArrowsDownUp, IconCategory, IconSearch } from '@tabler/icons-react';
import { JSX } from 'react';
import { GroupBy, SortBy, useAnnotationFilters } from './use-annotation-filters';

export function AnnotationFiltersComponent(): JSX.Element {
  const {
    types,
    setTypes,
    toggleType,
    searchTerm,
    setSearchTerm,
    showDeleted,
    setShowDeleted,
    sortBy,
    setSortBy,
    groupBy,
    setGroupBy,
  } = useAnnotationFilters();

  return (
    <Stack gap="md">
      <Flex align="center" gap="md">
        <TextInput
          placeholder="搜索标注..."
          leftSection={<IconSearch size={16} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          style={{ flex: 1 }}
        />

        <Group gap="md" ml="auto">
          <Checkbox
            label="高亮"
            checked={types.includes('highlight')}
            onChange={() => toggleType('highlight')}
          />
          <Checkbox
            label="笔记"
            checked={types.includes('note')}
            onChange={() => toggleType('note')}
          />
          <Checkbox
            label="书签"
            checked={types.includes('bookmark')}
            onChange={() => toggleType('bookmark')}
          />
          <Checkbox
            label="显示已删除"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.currentTarget.checked)}
          />
        </Group>
      </Flex>

      <Group gap="md">
        <Tooltip label="排序方式" openDelay={1000} position="top" withArrow>
          <Select
            leftSection={<IconArrowsDownUp size={16} />}
            value={sortBy}
            onChange={(value) => setSortBy(value as SortBy)}
            data={[
              { value: 'newest', label: '最新在前' },
              { value: 'oldest', label: '最早在前' },
              { value: 'page-asc', label: '页码升序' },
              { value: 'page-desc', label: '页码降序' },
            ]}
            style={{ width: 200 }}
          />
        </Tooltip>

        <Tooltip label="分组方式" openDelay={1000} position="top" withArrow>
          <Select
            leftSection={<IconCategory size={16} />}
            value={groupBy}
            onChange={(value) => setGroupBy(value as GroupBy)}
            data={[
              { value: 'none', label: '不分组' },
              { value: 'type', label: '按类型' },
              { value: 'chapter', label: '按章节' },
            ]}
            style={{ width: 200 }}
          />
        </Tooltip>
      </Group>
    </Stack>
  );
}
