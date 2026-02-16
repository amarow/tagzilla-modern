import { NavLink, Stack, Text, Group, ActionIcon, ScrollArea, Tooltip, Badge, Box } from '@mantine/core';
import { IconKey, IconShieldLock, IconPlus, IconDatabase, IconTag } from '@tabler/icons-react';
import { useAppStore } from '../store';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { translations } from '../i18n';
import { useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

const DraggableItem = ({ id, type, name, children }: { id: string | number, type: string, name: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${type}-${id}`,
    data: { type, id, name }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  return (
    <Box ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </Box>
  );
};

export const DataSidebar = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { 
    apiKeys, fetchApiKeys, privacyProfiles, fetchPrivacyProfiles, language, 
    generateApiKeyString, createApiKey, createPrivacyProfile,
    tags, fetchTags
  } = useAppStore();
  const t = translations[language];

  useEffect(() => {
    fetchApiKeys();
    fetchPrivacyProfiles();
    if (tags.length === 0) fetchTags();
  }, []);

  const isKeyActive = location.pathname.includes('/data/key/');
  const isRulesetActive = location.pathname.includes('/data/ruleset/');

  return (
    <ScrollArea h="100%" p="xs">
      <Stack gap="xl">
        {/* API KEYS SECTION */}
        <Stack gap="xs">
          <Group justify="space-between" px="xs">
            <Group gap="xs">
              <IconKey size={16} c="blue" />
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {t.apiKeys}
              </Text>
            </Group>
            <Tooltip label={t.createKey}>
              <ActionIcon 
                variant="subtle" 
                size="sm" 
                onClick={async () => {
                  const key = await generateApiKeyString();
                  await createApiKey(t.keyName + ' ' + (apiKeys.length + 1), 'all', [], key);
                  // Navigation will be handled by list update if we want, but better to navigate to the new key
                  fetchApiKeys();
                }}
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          
          <Stack gap={2}>
            {apiKeys.map(key => (
              <NavLink
                key={key.id}
                label={key.name}
                leftSection={<IconKey size={14} />}
                active={isKeyActive && id === key.id.toString()}
                onClick={() => navigate(`/data/key/${key.id}`)}
                variant="light"
                styles={{ label: { fontSize: '13px' } }}
              />
            ))}
          </Stack>
        </Stack>

        {/* RULESETS SECTION */}
        <Stack gap="xs">
          <Group justify="space-between" px="xs">
            <Group gap="xs">
              <IconShieldLock size={16} c="green" />
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {t.privacy}
              </Text>
            </Group>
            <Tooltip label={t.createProfile}>
              <ActionIcon 
                variant="subtle" 
                size="sm"
                onClick={async () => {
                  await createPrivacyProfile(t.profileName + ' ' + (privacyProfiles.length + 1));
                  fetchPrivacyProfiles();
                }}
              >
                <IconPlus size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
          
          <Stack gap={2}>
            {privacyProfiles.map(profile => (
              <DraggableItem key={profile.id} id={profile.id} type="RULESET" name={profile.name}>
                <NavLink
                  label={profile.name}
                  leftSection={<IconShieldLock size={14} />}
                  active={isRulesetActive && id === profile.id.toString()}
                  onClick={() => navigate(`/data/ruleset/${profile.id}`)}
                  variant="light"
                  styles={{ label: { fontSize: '13px' } }}
                />
              </DraggableItem>
            ))}
          </Stack>
        </Stack>

        {/* TAGS SECTION */}
        <Stack gap="xs">
          <Group px="xs">
            <IconTag size={16} c="orange" />
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              {t.tags}
            </Text>
          </Group>
          <Group gap={5} px="xs">
            {tags.map(tag => (
              <DraggableItem key={tag.id} id={tag.id} type="TAG" name={tag.name}>
                <Badge 
                  color={tag.color || 'blue'} 
                  variant="light" 
                  size="sm"
                  style={{ cursor: 'grab' }}
                >
                  {tag.name}
                </Badge>
              </DraggableItem>
            ))}
          </Group>
        </Stack>
      </Stack>
    </ScrollArea>
  );
};
