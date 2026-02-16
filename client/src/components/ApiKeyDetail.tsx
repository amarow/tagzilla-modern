import { useState, useEffect } from 'react';
import { Group, Stack, Text, Button, ActionIcon, TextInput, MultiSelect, Paper, Title, Divider, Badge, Select, LoadingOverlay, ScrollArea, Grid, Box } from '@mantine/core';
import { IconKey, IconCheck, IconCopy, IconShieldLock, IconDatabase, IconSearch, IconFileText, IconBraces, IconEye, IconExternalLink, IconX } from '@tabler/icons-react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { notifications } from '@mantine/notifications';
import { authFetch, API_BASE } from '../store/utils';
import { useDroppable } from '@dnd-kit/core';

import { useNavigate } from 'react-router-dom';

export const ApiKeyDetail = ({ apiKeyId }: { apiKeyId: number }) => {
  const navigate = useNavigate();
  const { 
    apiKeys, updateApiKey, tags, privacyProfiles, language, isLoading, token
  } = useAppStore();
  const t = translations[language];

  const { setNodeRef, isOver } = useDroppable({
    id: `apikey-drop-${apiKeyId}`,
    data: { type: 'API_KEY_TARGET', id: apiKeyId }
  });

  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  
  // Batch/Context Builder states
  const [batchTag, setBatchTag] = useState<string | null>(null);
  const [batchQuery, setBatchQuery] = useState('');
  const [batchLimit, setBatchLimit] = useState<number>(50);
  const [responseFormat, setResponseFormat] = useState<'text' | 'json'>('text');
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const apiKey = apiKeys.find(k => k.id === apiKeyId);

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name);
      setSelectedTags(apiKey.permissions.filter(p => p.startsWith('tag:')).map(p => p.split(':')[1]));
      setSelectedProfiles(apiKey.privacyProfileIds ? apiKey.privacyProfileIds.map(String) : []);
    }
  }, [apiKeyId, apiKeys]);

  const handlePreviewClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const span = target.closest('.redacted-text') as HTMLElement;
    if (span) {
        const ruleId = span.getAttribute('data-rule-id');
        const profileId = span.getAttribute('data-profile-id');
        if (profileId) {
            navigate(`/data/ruleset/${profileId}?ruleId=${ruleId}`);
        }
    }
  };

  const handleSave = async () => {
    const perms = selectedTags.length > 0 
        ? selectedTags.map(id => `tag:${id}`).join(',')
        : 'files:read,tags:read';
    const profileIds = selectedProfiles.map(id => parseInt(id));
    
    await updateApiKey(apiKeyId, { 
        name, 
        permissions: perms as any, 
        privacyProfileIds: profileIds 
    });
    
    notifications.show({
        title: t.save,
        message: 'API Key updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />
    });
  };

  const getDynamicUrl = () => {
    if (!apiKey) return '';
    let endpoint = responseFormat === 'json' ? 'json' : 'text';
    let url = `${API_BASE}/api/v1/files/${endpoint}?apiKey=${apiKey.key}&limit=${batchLimit}`;
    if (batchTag) url += `&tag=${encodeURIComponent(batchTag)}`;
    if (batchQuery) url += `&q=${encodeURIComponent(batchQuery)}`;
    return url;
  };

  const handleFetchPreview = async () => {
    if (!apiKey) return;
    setPreviewLoading(true);
    try {
        // For preview, we always want HTML highlighting if possible
        let previewUrl = getDynamicUrl() + '&format=html';

        const res = await fetch(previewUrl);
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
        }
        
        if (responseFormat === 'json') {
            const data = await res.json();
            setPreviewContent(JSON.stringify(data, null, 2));
        } else {
            const text = await res.text();
            setPreviewContent(text);
        }
    } catch (err: any) {
        setPreviewContent(`Error: ${err.message}`);
    } finally {
        setPreviewLoading(false);
    }
  };

  const getAvailableTags = () => {
    if (!apiKey) return [];
    if (apiKey.permissions.includes('all')) {
        return tags.map(t => ({ value: t.name, label: t.name }));
    }
    const allowedTagIds = apiKey.permissions
        .filter(p => p.startsWith('tag:'))
        .map(p => parseInt(p.split(':')[1]));

    return tags
        .filter(t => allowedTagIds.includes(t.id))
        .map(t => ({ value: t.name, label: t.name }));
  };

  if (!apiKey) return <Text>API Key not found</Text>;

  return (
    <Stack gap="md">
        <Paper 
            ref={setNodeRef}
            withBorder 
            p="xs" 
            radius="md" 
            bg={isOver ? 'var(--mantine-color-blue-light)' : 'var(--mantine-color-body)'}
            style={{ transition: 'background-color 0.2s ease', border: isOver ? '1px solid var(--mantine-color-blue-filled)' : undefined }}
        >
            <Group justify="space-between" align="flex-end" wrap="nowrap">
                <Group align="flex-end" gap="xs" style={{ flex: 1 }}>
                    <IconKey size={24} c="blue" style={{ marginBottom: 4 }} />
                    <TextInput 
                        label={t.keyName}
                        size="xs"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        style={{ width: 150 }}
                    />
                    <TextInput 
                        label="Token"
                        size="xs"
                        value={apiKey.key}
                        readOnly
                        rightSection={
                            <ActionIcon 
                                variant="subtle" 
                                size="xs"
                                onClick={() => {
                                    navigator.clipboard.writeText(apiKey.key);
                                    notifications.show({ message: t.copied, color: 'green', icon: <IconCheck size={14} /> });
                                }}
                            >
                                <IconCopy size={12} />
                            </ActionIcon>
                        }
                        styles={{ input: { fontFamily: 'monospace', fontSize: '10px', width: 120 } }}
                    />

                    <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
                        <Text size="xs" fw={500} c="dimmed">{t.tags}</Text>
                        <Group gap={4}>
                            {selectedTags.length > 0 ? selectedTags.map(id => {
                                const tag = tags.find(t => t.id.toString() === id);
                                return tag ? (
                                    <Badge 
                                        key={id} 
                                        variant="light" 
                                        size="sm" 
                                        color={tag.color || 'blue'}
                                        rightSection={
                                            <ActionIcon size="xs" variant="transparent" color="gray" onClick={() => {
                                                const newTags = selectedTags.filter(tId => tId !== id);
                                                setSelectedTags(newTags);
                                                // Trigger auto-save if desired, or keep manual
                                            }}>
                                                <IconX size={10} />
                                            </ActionIcon>
                                        }
                                    >
                                        {tag.name}
                                    </Badge>
                                ) : null;
                            }) : <Text size="xs" c="dimmed" fs="italic">Drag tags here</Text>}
                        </Group>
                    </Stack>

                    <Stack gap={2} style={{ flex: 1, minWidth: 200 }}>
                        <Text size="xs" fw={500} c="dimmed">{t.privacy}</Text>
                        <Group gap={4}>
                            {selectedProfiles.length > 0 ? selectedProfiles.map(id => {
                                const profile = privacyProfiles.find(p => p.id.toString() === id);
                                return profile ? (
                                    <Badge 
                                        key={id} 
                                        variant="outline" 
                                        size="sm" 
                                        color="green"
                                        leftSection={<IconShieldLock size={10} />}
                                        rightSection={
                                            <ActionIcon size="xs" variant="transparent" color="gray" onClick={() => {
                                                const newProfiles = selectedProfiles.filter(pId => pId !== id);
                                                setSelectedProfiles(newProfiles);
                                            }}>
                                                <IconX size={10} />
                                            </ActionIcon>
                                        }
                                    >
                                        {profile.name}
                                    </Badge>
                                ) : null;
                            }) : <Text size="xs" c="dimmed" fs="italic">Drag rulesets here</Text>}
                        </Group>
                    </Stack>
                </Group>
                <Button 
                    size="xs"
                    onClick={handleSave} 
                    loading={isLoading}
                    leftSection={<IconCheck size={16} />}
                >
                    {t.save}
                </Button>
            </Group>
        </Paper>

        <Paper withBorder p="xs" radius="md" bg="var(--mantine-color-body)">
            <Stack gap="xs">
                <ContextBuilderSettings 
                    batchTag={batchTag} setBatchTag={setBatchTag}
                    batchQuery={batchQuery} setBatchQuery={setBatchQuery}
                    batchLimit={batchLimit} setBatchLimit={setBatchLimit}
                    responseFormat={responseFormat} setResponseFormat={setResponseFormat}
                    getAvailableTags={getAvailableTags}
                    handleFetchPreview={handleFetchPreview}
                />
                <Divider variant="dashed" />
                <Group gap="xs" wrap="nowrap">
                    <Badge variant="filled" color="blue" radius="xs" size="sm">GET</Badge>
                    <Text 
                        size="xs" 
                        style={{ 
                            wordBreak: 'break-all', 
                            fontFamily: 'monospace', 
                            flex: 1, 
                            color: 'var(--mantine-color-blue-7)',
                            padding: '4px 8px',
                            background: 'var(--mantine-color-gray-0)',
                            borderRadius: '4px',
                            border: '1px solid var(--mantine-color-gray-2)'
                        }}
                        darkHidden
                    >
                        {getDynamicUrl()}
                    </Text>
                    <Text 
                        size="xs" 
                        style={{ 
                            wordBreak: 'break-all', 
                            fontFamily: 'monospace', 
                            flex: 1, 
                            color: 'var(--mantine-color-blue-2)',
                            padding: '4px 8px',
                            background: 'var(--mantine-color-dark-8)',
                            borderRadius: '4px',
                            border: '1px solid var(--mantine-color-dark-7)'
                        }}
                        lightHidden
                    >
                        {getDynamicUrl()}
                    </Text>
                    <Group gap={5}>
                        <ActionIcon 
                            size="sm" 
                            variant="subtle" 
                            onClick={() => {
                                navigator.clipboard.writeText(getDynamicUrl());
                                notifications.show({ message: t.copied, color: 'blue' });
                            }}
                        >
                            <IconCopy size={16} />
                        </ActionIcon>
                        <ActionIcon 
                            size="sm" 
                            variant="subtle" 
                            component="a" 
                            href={getDynamicUrl()} 
                            target="_blank"
                        >
                            <IconExternalLink size={16} />
                        </ActionIcon>
                    </Group>
                </Group>
            </Stack>
        </Paper>

        <Stack gap="xs" style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            <Group justify="space-between" align="center">
                <Text size="sm" fw={700}>Preview Result</Text>
                <Badge variant="dot" size="xs" color="blue">Live Preview</Badge>
            </Group>
            <Paper 
                withBorder 
                p="xs" 
                style={{ 
                    flex: 1,
                    overflow: 'auto',
                    background: 'var(--mantine-color-body)',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                    minHeight: '500px',
                    cursor: 'text'
                }}
                onClick={handlePreviewClick}
            >
                <LoadingOverlay visible={previewLoading} overlayProps={{ blur: 1 }} />
                {previewContent ? (
                    <div dangerouslySetInnerHTML={{ __html: responseFormat === 'json' ? previewContent : previewContent }} />
                ) : (
                    <Text c="dimmed" ta="center" mt="xl">Adjust settings and click 'Test' to see the anonymized output.</Text>
                )}
            </Paper>
        </Stack>
    </Stack>
  );
};

const ContextBuilderSettings = ({ 
    batchTag, setBatchTag, 
    batchQuery, setBatchQuery, 
    batchLimit, setBatchLimit, 
    responseFormat, setResponseFormat,
    getAvailableTags,
    handleFetchPreview
}: any) => (
    <Group align="flex-end" gap="sm">
        <Select
            label="Filter Tag"
            size="sm"
            clearable
            placeholder="All Tags"
            data={getAvailableTags()}
            value={batchTag}
            onChange={setBatchTag}
            style={{ width: 160 }}
        />
        <TextInput
            label="Search Query"
            size="sm"
            placeholder="Search keywords..."
            leftSection={<IconSearch size={14} />}
            value={batchQuery}
            onChange={(e) => setBatchQuery(e.target.value)}
            style={{ flex: 1 }}
        />
        <Select
            label="Format"
            size="sm"
            data={[
                { value: 'text', label: 'Text' },
                { value: 'json', label: 'JSON' }
            ]}
            value={responseFormat}
            onChange={(val) => setResponseFormat(val as any)}
            style={{ width: 90 }}
        />
        <Select
            label="Limit"
            size="sm"
            data={['10', '50', '100', '200']}
            value={batchLimit.toString()}
            onChange={(val) => setBatchLimit(parseInt(val || '50'))}
            style={{ width: 80 }}
        />
        <Button 
            onClick={handleFetchPreview}
            leftSection={<IconEye size={16} />}
        >
            Test
        </Button>
    </Group>
);
