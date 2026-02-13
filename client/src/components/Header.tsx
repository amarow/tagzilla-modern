import { AppShell, Burger, Group, Text, ActionIcon, TextInput, Tooltip, Button } from '@mantine/core';
import { IconSearch, IconX, IconSettings, IconLogout } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { TagzillaLogo } from './Logo';

interface HeaderProps {
  opened: boolean;
  toggle: () => void;
}

export const Header = ({ opened, toggle }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    logout, user, searchCriteria, setSearchCriteria, performSearch, 
    language, toggleLanguage 
  } = useAppStore();
  
  const t = translations[language];

  const logo = (
    <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
      <TagzillaLogo size={32} showText={false} />
      <Group gap={0}>
        <Text fw={900} size="lg" c="green.8" style={{ letterSpacing: -0.5 }}>Tag</Text>
        <Text fw={900} size="lg" c="blue.7" style={{ letterSpacing: -0.5 }}>Zilla</Text>
      </Group>
    </Group>
  );

  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          {logo}
        </Group>

        <Group gap="xs">
          <form action="." autoComplete="off" onSubmit={(e) => { e.preventDefault(); performSearch(); }}>
            <Group gap={8}>
              <TextInput 
                placeholder={t.searchModeDirectory || 'Verzeichnis'}
                leftSection={<IconSearch size={14} />} 
                style={{ width: 200 }}
                value={searchCriteria.directory}
                size="xs"
                autoComplete="off"
                onChange={(e) => {
                  setSearchCriteria({ directory: e.currentTarget.value });
                  if (location.pathname !== '/') navigate('/');
                }}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                rightSection={
                  searchCriteria.directory ? (
                    <ActionIcon variant="transparent" c="dimmed" size="xs" onClick={() => setSearchCriteria({ directory: '' })}>
                      <IconX size={12} />
                    </ActionIcon>
                  ) : null
                }
              />
              <TextInput 
                placeholder={t.name || 'Dateiname'}
                leftSection={<IconSearch size={14} />} 
                style={{ width: 200 }}
                value={searchCriteria.filename}
                size="xs"
                autoComplete="off"
                onChange={(e) => {
                  setSearchCriteria({ filename: e.currentTarget.value });
                  if (location.pathname !== '/') navigate('/');
                }}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                rightSection={
                  searchCriteria.filename ? (
                    <ActionIcon variant="transparent" c="dimmed" size="xs" onClick={() => setSearchCriteria({ filename: '' })}>
                      <IconX size={12} />
                    </ActionIcon>
                  ) : null
                }
              />
              <TextInput 
                placeholder={t.searchContent || 'Inhalt'}
                leftSection={<IconSearch size={14} />} 
                style={{ width: 250 }}
                value={searchCriteria.content}
                size="xs"
                autoComplete="off"
                onChange={(e) => {
                  setSearchCriteria({ content: e.currentTarget.value });
                  if (location.pathname !== '/') navigate('/');
                }}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                rightSection={
                  searchCriteria.content ? (
                    <ActionIcon variant="transparent" c="dimmed" size="xs" onClick={() => setSearchCriteria({ content: '' })}>
                      <IconX size={12} />
                    </ActionIcon>
                  ) : null
                }
              />
            </Group>
          </form>
        </Group>

        <Group>
          <Tooltip label={t.settings}>
            <ActionIcon 
              onClick={() => navigate('/settings')} 
              variant="default" 
              size="lg" 
              aria-label={t.settings}
            >
              <IconSettings size={18} />
            </ActionIcon>
          </Tooltip>
          
          <Tooltip label={t.changeLanguage}>
            <Button 
              variant="default" 
              size="xs" 
              onClick={toggleLanguage} 
              fw={700}
              style={{ textTransform: 'uppercase' }}
            >
              {language}
            </Button>
          </Tooltip>

          {user && (
            <Text size="sm" fw={500} c="dimmed" mr="xs">
              {user.username}
            </Text>
          )}

          <Tooltip label={t.logout}>
            <ActionIcon onClick={logout} variant="default" size="lg" aria-label={t.logout}>
              <IconLogout size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </AppShell.Header>
  );
};
