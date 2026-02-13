import { useState } from 'react';
import { AppShell, Stack, Group, Text, TextInput, ActionIcon, ScrollArea, Button, Modal, ColorSwatch } from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconCheck, IconTags } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { TagItem } from './DndComponents';
import { modals } from '@mantine/modals';

const TAG_COLORS = [
    '#fa5252', '#fd7e14', '#fab005', '#40c057', '#228be6', '#7950f2', '#e64980', '#868e96'
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    tags, selectedTagIds, toggleTagFilter, selectSingleTag, createTag, 
    updateTag, deleteTag, language 
  } = useAppStore();
  
  const t = translations[language];

  const [newTagInput, setNewTagInput] = useState('');
  const [editingTag, setEditingTag] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleCreateTag = async () => {
    if (newTagInput.trim()) {
        await createTag(newTagInput.trim(), '#40c057');
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
    
    modals.openConfirmModal({
        title: t.deleteTag,
        children: (
            <Text size="sm">
                {fileCount > 0 
                    ? t.deleteTagConfirm.replace('{count}', fileCount.toString())
                    : t.areYouSure}
            </Text>
        ),
        labels: { confirm: t.delete, cancel: t.cancel },
        confirmProps: { color: 'red' },
        onConfirm: () => deleteTag(tag.id),
    });
  };

  return (
    <>
      <AppShell.Navbar p="md" onClick={() => { if (location.pathname === '/settings') navigate('/'); }} style={{ cursor: location.pathname === '/settings' ? 'pointer' : 'default' }}>
        <Stack gap="xs">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <IconTags size={20} />
              <Text fw={500}>{t.tags}</Text>
            </Group>
          </Group>

          <Stack gap={5}>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateTag(); }} autoComplete="off">
                <TextInput 
                    placeholder={t.newTagName}
                    size="xs"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.currentTarget.value)}
                    autoComplete="off"
                    rightSection={
                        <ActionIcon variant="transparent" onClick={handleCreateTag} title={t.createTag}>
                            <IconPlus size={16} />
                        </ActionIcon>
                    }
                />
            </form>
          </Stack>

          <ScrollArea h="calc(100vh - 180px)" mt="sm">
            <Stack gap={4}>
              {tags.map(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                <TagItem 
                    key={tag.id} 
                    tag={tag} 
                    isSelected={isSelected}
                    onClick={(e: React.MouseEvent) => { 
                        e.stopPropagation();
                        if (e.ctrlKey || e.metaKey) {
                            toggleTagFilter(tag.id); 
                        } else {
                            if (selectedTagIds.length === 1 && selectedTagIds[0] === tag.id) {
                                toggleTagFilter(tag.id);
                            } else {
                                selectSingleTag(tag.id);
                            }
                        }
                        navigate('/'); 
                    }}
                >
                    <Group gap={0} wrap="nowrap">
                        <Button 
                          variant={isSelected ? "light" : "subtle"}
                          color={isSelected ? (tag.color || "appleBlue") : "gray"}
                          fullWidth 
                          size="xs"
                          justify="space-between"
                          leftSection={<div style={{ width: 30 }} />}
                          rightSection={
                              <div style={{ width: 30, textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
                                  <Text size="xs" fw={700} c={isSelected ? (tag.color || "appleBlue") : "dimmed"}>
                                      {tag._count?.files}
                                  </Text>
                              </div>
                          }
                          style={{ 
                              pointerEvents: 'none', 
                              borderTopRightRadius: 0, 
                              borderBottomRightRadius: 0, 
                              borderRight: '1px solid rgba(0,0,0,0.1)',
                              fontWeight: 500
                          }} 
                        >
                        <Text size="xs" fw={600} style={{ flex: 1, textAlign: 'center' }}>
                            {tag.name}
                        </Text>
                        </Button>
                        <ActionIcon 
                            size="30px" 
                            variant={isSelected ? "light" : "subtle"}
                            color={isSelected ? (tag.color || "appleBlue") : (tag.color || "gray")}
                            style={{ borderRadius: 0, borderRight: '1px solid rgba(0,0,0,0.1)' }}
                            onClick={(e) => openEditTagModal(tag, e)}
                            title={t.editTag}
                            disabled={(tag.isEditable as any) === 0}
                        >
                            <IconPencil size={14} />
                        </ActionIcon>
                        <ActionIcon 
                            size="30px" 
                            variant={isSelected ? "light" : "subtle"}
                            color={isSelected ? (tag.color || "appleBlue") : "gray"}
                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            onClick={(e) => handleDeleteTag(e, tag)}
                            title={t.deleteTag}
                            disabled={(tag.isEditable as any) === 0}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Group>
                </TagItem>
              )})}
              {tags.length === 0 && <Text size="xs" c="dimmed">No tags created yet.</Text>}
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

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
                        backgroundColor: `${editColor}15`,
                        color: editColor,
                        fontWeight: 700,
                        textAlign: 'center',
                        border: `1px solid ${editColor}30`,
                        fontSize: '1.1rem'
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

            <Button 
                fullWidth 
                onClick={handleUpdateTag} 
                variant="default"
            >
                {t.save}
            </Button>
        </Stack>
      </Modal>
    </>
  );
};
