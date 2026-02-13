import { useState } from 'react';
import { Title, Card, Group, Stack, Text, Button, Checkbox, ActionIcon, Modal, TextInput, Loader, ScrollArea } from '@mantine/core';
import { IconPlus, IconFolder, IconRefresh, IconTrash, IconArrowUp, IconCheck } from '@tabler/icons-react';
import { useAppStore } from '../../store';
import { translations } from '../../i18n';
import { modals } from '@mantine/modals';

export const ScopeSettings = () => {
  const { 
    scopes, addScope, refreshScope, deleteScope, activeScopeIds, toggleScopeActive, 
    token, language 
  } = useAppStore();
  const t = translations[language];

  // Directory Browser State
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserEntries, setBrowserEntries] = useState<any[]>([]);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);

  const fetchDirectory = async (path: string = '') => {
    setIsBrowserLoading(true);
    try {
        if (!token) return;
        const url = new URL('http://localhost:3001/api/fs/list');
        if (path) url.searchParams.append('path', path);
        const res = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setBrowserPath(data.currentPath);
            setBrowserEntries(data.entries);
        }
    } catch (e) {
        console.error("Failed to fetch directory", e);
    } finally {
        setIsBrowserLoading(false);
    }
  };

  const handleOpenBrowser = () => {
    setIsBrowserOpen(true);
    fetchDirectory();
  };

  const handleBrowserSelect = async () => {
    await addScope(browserPath);
    setIsBrowserOpen(false);
  };

  return (
    <>
      <Title order={3} mb="md">{t.managedScopes}</Title>
      <Card withBorder shadow="sm" radius="md" mb="xl">
          <Card.Section withBorder inheritPadding py="xs">
              <Group justify="space-between">
                  <Stack gap={0}>
                      <Text fw={500}>{t.managedScopes}</Text>
                      <Text size="xs" c="dimmed">{t.checkScopes}</Text>
                  </Stack>
                  <Button 
                      leftSection={<IconPlus size={16} />} 
                      variant="light" 
                      size="xs" 
                      onClick={handleOpenBrowser}
                  >
                      {t.add}
                  </Button>
              </Group>
          </Card.Section>

          <Stack gap="xs" mt="md">
              {scopes.length === 0 && (
                  <Text c="dimmed" ta="center" py="md">{t.noScopesActive}</Text>
              )}
              
              {scopes.map(scope => (
                  <Group key={scope.id} justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: '4px' }}>
                      <Group>
                          <Checkbox 
                              checked={activeScopeIds.includes(scope.id)}
                              onChange={() => toggleScopeActive(scope.id)}
                              label={
                                  <div>
                                      <Group gap="xs">
                                          <IconFolder size={20} color="gray" style={{ display: 'inline' }} />
                                          <Text size="sm" fw={500} span>{scope.name}</Text>
                                      </Group>
                                      <Text size="xs" c="dimmed" pl={34}>{scope.path}</Text>
                                  </div>
                              }
                          />
                      </Group>
                      <Group gap="xs">
                          <ActionIcon 
                              variant="light" 
                              onClick={() => refreshScope(scope.id)}
                              title={t.rescan}
                          >
                              <IconRefresh size={16} />
                          </ActionIcon>
                          <ActionIcon 
                              variant="light" 
                              color="red"
                              onClick={() => { 
                                  modals.openConfirmModal({
                                      title: t.deleteScopeTitle,
                                      children: <Text size="sm">{t.deleteScope}</Text>,
                                      labels: { confirm: t.delete, cancel: t.cancel },
                                      confirmProps: { color: 'red' },
                                      onConfirm: () => deleteScope(scope.id),
                                  });
                              }}
                              title={t.removeScope}
                          >
                              <IconTrash size={16} />
                          </ActionIcon>
                      </Group>
                  </Group>
              ))}
          </Stack>
      </Card>

      <Modal 
          opened={isBrowserOpen} 
          onClose={() => setIsBrowserOpen(false)} 
          title={t.selectDirectory}
          size="lg"
      >
          <Stack>
              <Group>
                  <TextInput 
                      value={browserPath} 
                      onChange={(e) => setBrowserPath(e.currentTarget.value)}
                      style={{ flex: 1 }}
                      rightSection={isBrowserLoading ? <Loader size="xs" /> : null}
                      onKeyDown={(e) => e.key === 'Enter' && fetchDirectory(browserPath)}
                  />
                  <Button onClick={() => fetchDirectory(browserPath)} variant="default">{t.go}</Button>
              </Group>
              
              <Card withBorder p={0}>
                  <ScrollArea h={300}>
                      {browserEntries.map((entry) => (
                          <Group 
                              key={entry.path} 
                              p="xs" 
                              style={{ 
                                  cursor: 'pointer', 
                                  borderBottom: '1px solid var(--mantine-color-default-border)' 
                              }}
                              onClick={() => fetchDirectory(entry.path)}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--mantine-color-default-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                              {entry.name === '..' ? <IconArrowUp size={16} /> : <IconFolder size={16} />}
                              <Text size="sm">{entry.name}</Text>
                          </Group>
                      ))}
                      {browserEntries.length === 0 && !isBrowserLoading && (
                          <Text c="dimmed" p="md" ta="center">{t.directoryEmpty}</Text>
                      )}
                  </ScrollArea>
              </Card>

              <Group justify="flex-end">
                  <Button variant="default" onClick={() => setIsBrowserOpen(false)}>{t.cancel}</Button>
                  <Button onClick={handleBrowserSelect} leftSection={<IconCheck size={16} />}>
                      {t.select}
                  </Button>
              </Group>
          </Stack>
      </Modal>
    </>
  );
};
