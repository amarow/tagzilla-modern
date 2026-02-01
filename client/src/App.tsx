import { AppShell, Burger, Group, Text, ScrollArea, Button, Loader, Alert, Stack, Badge, ActionIcon, TextInput, NavLink, useMantineColorScheme, Card, Title, PasswordInput, Container, Modal, ColorInput, Popover, ColorSwatch, Center } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTags, IconPlus, IconAlertCircle, IconX, IconSearch, IconSun, IconMoon, IconLogout, IconBrush, IconBan, IconTrash, IconSettings, IconPencil, IconCheck, IconLanguage } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, type DragEndEvent } from '@dnd-kit/core';
import { TagItem } from './components/DndComponents';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { SettingsPage } from './pages/Settings';
import { translations } from './i18n';

const TAG_COLORS = [
    '#fa5252', // Red
    '#fd7e14', // Orange
    '#fab005', // Yellow
    '#40c057', // Green
    '#228be6', // Blue
    '#7950f2', // Violet
    '#e64980', // Pink
    '#868e96'  // Gray
];

export default function App() {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    isAuthenticated, login, register, logout, error: storeError,
    tags, isLoading, 
    selectedTagId, searchQuery, selectedFileIds,
    init, addTagToFile, addTagToMultipleFiles, createTag, deleteTag, updateTag,
    setTagFilter, setSearchQuery, language, toggleLanguage
  } = useAppStore();
  
  const t = translations[language];

  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // App State
  const [newTagInput, setNewTagInput] = useState('');
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  // Tag Edit State
  const [editingTag, setEditingTag] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (isAuthenticated) {
        init();
    }
  }, [isAuthenticated]);

  const handleAuthSubmit = async () => {
    if (!username || !password) return;
    if (isRegistering) {
        await register(username, password);
        setIsRegistering(false); 
    } else {
        await login(username, password);
    }
  };

  const handleCreateTag = async () => {
    if (newTagInput.trim()) {
        await createTag(newTagInput.trim(), '#40c057'); // Default Godzilla Green
        setNewTagInput('');
    }
  };

  const handleUpdateTag = () => {
      if (editingTag && editName.trim()) {
          setEditingTag(null);
          updateTag(editingTag.id, { name: editName, color: editColor });
      }
  };

  const openEditTagModal = (tag: any, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingTag(tag);
      setEditName(tag.name);
      setEditColor(tag.color || '#228be6');
  };

  const handleDeleteTag = async (e: React.MouseEvent, tag: any) => {
    e.stopPropagation();
    const fileCount = tag._count?.files || 0;
    if (fileCount > 0) {
        if (!window.confirm(t.deleteTagConfirm.replace('{count}', fileCount.toString()))) {
            return;
        }
    }
    await deleteTag(tag.id);
  };

  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    const activeId = active.data.current?.id;
    const overId = over.data.current?.id;

    if (activeType === 'TAG' && overType === 'FILE_TARGET') {
        const tagName = active.data.current?.name;
        if (tagName && overId) {
             if (selectedFileIds.includes(overId)) {
                 addTagToMultipleFiles(selectedFileIds, tagName);
             } else {
                 addTagToFile(overId, tagName);
             }
        }
    }

    if (activeType === 'FILE' && overType === 'TAG_TARGET') {
        const tagName = over.data.current?.name;
        if (tagName && activeId) {
             if (selectedFileIds.includes(activeId)) {
                 addTagToMultipleFiles(selectedFileIds, tagName);
             } else {
                 addTagToFile(activeId, tagName);
             }
        }
    }
  };

  if (!isAuthenticated) {
      return (
          <Container size="xs" mt="xl">
              <Card withBorder shadow="sm" p="lg" radius="md">
                  <Title order={2} ta="center" mb="lg">{t.appName}</Title>
                  <Stack>
                      {storeError && <Alert color="red" title="Error">{storeError}</Alert>}
                      <TextInput 
                        label={t.username} 
                        placeholder={t.username} 
                        required 
                        value={username} 
                        onChange={(e) => setUsername(e.currentTarget.value)}
                      />
                      <PasswordInput 
                        label={t.password} 
                        placeholder={t.password} 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
                      />
                      <Button fullWidth mt="md" onClick={handleAuthSubmit} loading={isLoading}>
                          {isRegistering ? t.register : t.login}
                      </Button>
                      <Text c="dimmed" size="sm" ta="center" style={{ cursor: 'pointer' }} onClick={() => setIsRegistering(!isRegistering)}>
                          {isRegistering ? t.alreadyHaveAccount : t.dontHaveAccount}
                      </Text>
                  </Stack>
              </Card>
          </Container>
      );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>{t.appName}</Text>
          </Group>
          
          <Group>
            <TextInput 
                placeholder={t.searchPlaceholder}
                leftSection={<IconSearch size={16} />} 
                style={{ width: 400 }}
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.currentTarget.value);
                    if (location.pathname !== '/') navigate('/');
                }}
                rightSection={
                searchQuery ? (
                    <ActionIcon variant="transparent" c="dimmed" onClick={() => setSearchQuery('')}>
                    <IconX size={14} />
                    </ActionIcon>
                ) : null
                }
            />
          </Group>

          <Group>
            <Button 
                variant="default" 
                size="xs" 
                onClick={toggleLanguage} 
                fw={700}
                style={{ textTransform: 'uppercase' }}
            >
                {language}
            </Button>
            <ActionIcon 
                onClick={() => navigate('/settings')} 
                variant={location.pathname === '/settings' ? "filled" : "default"} 
                size="lg" 
                aria-label={t.settings}
                title={t.settings}
                color={location.pathname === '/settings' ? 'blue' : undefined}
            >
                <IconSettings size={18} />
            </ActionIcon>
            <ActionIcon onClick={() => toggleColorScheme()} variant="default" size="lg" aria-label="Toggle color scheme">
                {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <ActionIcon onClick={logout} variant="default" size="lg" aria-label="Logout" title="Logout">
                <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTags size={20} />
              <Text fw={500}>{t.tags}</Text>
            </Group>
          </Group>

          <Stack gap={5}>
            <TextInput 
                placeholder={t.newTagName}
                size="xs"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                rightSection={
                    <ActionIcon variant="transparent" color="blue" onClick={handleCreateTag} title={t.createTag}>
                        <IconPlus size={16} />
                    </ActionIcon>
                }
            />
          </Stack>

          <ScrollArea h="calc(100vh - 180px)" mt="sm">
            <Stack gap={4}>
              <NavLink 
                 label={t.files}
                 leftSection={<IconTags size={16} />}
                 active={!selectedTagId && location.pathname === '/'}
                 onClick={() => { setTagFilter(null); navigate('/'); }}
                 variant="light"
                 mb={4}
               />
              {tags.map(tag => (
                <TagItem 
                    key={tag.id} 
                    tag={tag} 
                    isSelected={selectedTagId === tag.id}
                    onClick={() => { setTagFilter(tag.id); navigate('/'); }}
                >
                    <Group gap={0} wrap="nowrap">
                        <Button 
                        variant={selectedTagId === tag.id ? "filled" : "light"}
                        color={tag.color || (selectedTagId === tag.id ? "blue" : "gray")}
                        fullWidth 
                        justify="space-between" 
                        size="xs"
                        rightSection={<Badge size="xs" variant="transparent" color="dark" style={{ mixBlendMode: 'multiply' }}>{tag._count?.files}</Badge>}
                        style={{ 
                            pointerEvents: 'none', 
                            borderTopRightRadius: 0, 
                            borderBottomRightRadius: 0, 
                            borderRight: '1px solid rgba(0,0,0,0.1)',
                            color: tag.color ? 'white' : undefined
                        }} 
                        >
                        {tag.name}
                        </Button>
                        <ActionIcon 
                            size="30px" 
                            variant="light"
                            color="gray"
                            style={{ borderRadius: 0, borderRight: '1px solid rgba(0,0,0,0.1)' }}
                            onClick={(e) => openEditTagModal(tag, e)}
                            title={t.editTag}
                        >
                            <IconPencil size={14} />
                        </ActionIcon>
                        <ActionIcon 
                            size="30px" 
                            variant={selectedTagId === tag.id ? "filled" : "light"}
                            color={selectedTagId === tag.id ? "blue" : "gray"}
                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            onClick={(e) => handleDeleteTag(e, tag)}
                            title={t.removeScope}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Group>
                </TagItem>
              ))}
              {tags.length === 0 && <Text size="xs" c="dimmed">No tags created yet.</Text>}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell.Main>

      <DragOverlay>
        {activeDragItem ? (
           <Button 
             variant="filled" 
             color="blue" 
             size="xs" 
             style={{ cursor: 'grabbing', opacity: 0.9 }}
             rightSection={
                 (activeDragItem.type === 'FILE' && selectedFileIds.includes(activeDragItem.id) && selectedFileIds.length > 1) 
                 ? <Badge size="xs" circle color="white" c="blue">{selectedFileIds.length}</Badge> 
                 : null
             }
           >
              {activeDragItem.name}
           </Button>
        ) : null}
      </DragOverlay>
    </AppShell>

    <Modal opened={!!editingTag} onClose={() => setEditingTag(null)} title={t.editTag} size="xs" centered>
        <Stack gap="lg">
            <TextInput 
                value={editName} 
                onChange={(e) => setEditName(e.currentTarget.value)} 
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTag();
                }}
                placeholder={t.tagName}
                size="md"
                data-autofocus
                styles={{
                    input: {
                        backgroundColor: editColor,
                        color: ['#fab005', '#fcc419'].includes(editColor) ? 'black' : 'white',
                        fontWeight: 600,
                        textAlign: 'center',
                        border: '1px solid rgba(0,0,0,0.1)',
                    }
                }}
            />
            
            <Group gap={8} justify="center" wrap="wrap">
                {TAG_COLORS.map((color) => (
                    <ColorSwatch 
                        key={color} 
                        color={color} 
                        onClick={() => setEditColor(color)}
                        style={{ color: '#fff', cursor: 'pointer' }}
                        size={24}
                    >
                        {editColor === color && <IconCheck size={14} />}
                    </ColorSwatch>
                ))}
            </Group>

            <Button fullWidth onClick={handleUpdateTag} variant="default">{t.save}</Button>
        </Stack>
    </Modal>
    </DndContext>
  );
}