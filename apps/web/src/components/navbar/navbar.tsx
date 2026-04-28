import {
  ActionIcon,
  Box,
  Flex,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBooks,
  IconCalendar,
  IconChartBar,
  IconDownload,
  IconMoon,
  IconReload,
  IconSun,
} from '@tabler/icons-react';
import { JSX, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { RoutePath } from '../../routes';
import { Logo } from '../logo/logo';
import { DownloadPluginModal } from './download-plugin';
import { UploadForm } from './upload-form';

import style from './navbar.module.css';

export function Navbar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { pathname } = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme();
  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const [downloadOpened, { close: closeDownload, open: openDownload }] = useDisclosure(false);

  const tabs = [
    { link: RoutePath.BOOKS, label: '书籍', icon: IconBooks },
    { link: RoutePath.CALENDAR, label: '日历', icon: IconCalendar },
    { link: RoutePath.STATS, label: '阅读统计', icon: IconChartBar },
    { link: RoutePath.SYNCS, label: '进度同步', icon: IconReload },
    { onClick: openDownload, label: 'KOReader 插件', icon: IconDownload },
  ];

  const [active, setActive] = useState(
    () => tabs.find((item) => item.link === pathname)?.link ?? RoutePath.HOME
  );

  const onClick = (link: RoutePath) => {
    setActive(link);
    onNavigate?.();
  };

  const links = tabs.map((item) =>
    item.link ? (
      <NavLink
        className={style.Link}
        data-active={item.link === active || undefined}
        to={item.link}
        key={item.label}
        onClick={() => onClick(item.link)}
      >
        <item.icon className={style.LinkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </NavLink>
    ) : (
      <a className={style.Link} key={item.label} onClick={() => item.onClick()}>
        <item.icon className={style.LinkIcon} stroke={1.5} />
        <span>{item.label}</span>
      </a>
    )
  );

  return (
    <Box className={style.Navbar} component="nav">
      <Logo
        onClick={() => {
          setActive(RoutePath.HOME);
          onNavigate?.();
        }}
        className={style.Logo}
      />
      <div>{links}</div>
      <div className={style.Footer}>
        <Flex gap="xs">
          <UploadForm />
          <ActionIcon
            onClick={toggleColorScheme}
            variant="default"
            size="lg"
            aria-label="切换主题"
          >
            {computedColorScheme === 'dark' ? (
              <IconSun stroke={1.5} color="yellow" />
            ) : (
              <IconMoon stroke={1.5} color="violet" />
            )}
          </ActionIcon>
        </Flex>
      </div>
      <DownloadPluginModal opened={downloadOpened} onClose={closeDownload} />
    </Box>
  );
}
