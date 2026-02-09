import { Image, Text, LoadingOverlay, Button, Group, Center, Code, Table, Paper, ActionIcon, Stack } from '@mantine/core';
import { useAppStore } from '../store';
import { useEffect, useState } from 'react';
import { IconExternalLink, IconFileUnknown, IconArrowLeft, IconX } from '@tabler/icons-react';
import ReactMarkdown from 'react-markdown';
import Papa from 'papaparse';

export function FilePreviewPanel() {
    const { previewFileId, setPreviewFileId, files, searchResults, token, openFile } = useAppStore();
    const [textContent, setTextContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Look up file in files list OR search results
    const file = files.find(f => f.id === previewFileId) || searchResults.find(f => f.id === previewFileId);

    const API_BASE = 'http://localhost:3001';

    // Handle Escape key to close preview
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setPreviewFileId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setPreviewFileId]);

    useEffect(() => {
        if (!file || !token) return;
        
        const ext = file.extension.toLowerCase();
        // Expanded list of text-like files
        const isText = [
            '.txt', '.md', '.json', '.ts', '.js', '.jsx', '.tsx', '.css', '.scss', '.html', '.xml', '.yaml', '.yml', '.sql', '.env', '.log', '.sh', '.py',
            '.rs', '.go', '.c', '.cpp', '.h', '.java', '.kt', '.rb', '.php', '.pl', '.lua', '.toml', '.ini', '.conf', '.dockerfile', '.csv', '.svg'
        ].includes(ext);
        
        if (isText) {
            setLoading(true);
            setError(null);
            fetch(`${API_BASE}/api/files/${file.id}/content?token=${token}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to load content");
                    return res.text();
                })
                .then(text => {
                    // Limit text size for performance
                    if (text.length > 100000) {
                        setTextContent(text.substring(0, 100000) + `\n\n... (Content truncated for preview) ...`);
                    } else {
                        setTextContent(text);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
        } else {
            setTextContent(null);
            setLoading(false);
            setError(null);
        }
    }, [file, token]);

    if (!file) return null;

    const fileUrl = `${API_BASE}/api/files/${file.id}/content?token=${token}`;
    const ext = file.extension.toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif'].includes(ext); // Removed .svg from image list to treat as text/code unless rendered as img? Actually SVG is fine as img.
    const isPdf = ext === '.pdf';
    const isAudio = ['.mp3', '.wav', '.ogg', '.flac', '.aac'].includes(ext);
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);
    const isMarkdown = ['.md', '.markdown'].includes(ext);
    const isCsv = ['.csv'].includes(ext);
    const isJson = ['.json'].includes(ext);
    const isCodeOrText = textContent !== null;

    // Helper for CSV parsing
    let parsedCsv: any[] = [];
    let csvColumns: string[] = [];
    if (isCsv && textContent) {
        const result = Papa.parse(textContent, { header: true, skipEmptyLines: true });
        parsedCsv = result.data;
        csvColumns = result.meta.fields || [];
    }

    // Helper for JSON formatting
    let formattedJson = textContent;
    if (isJson && textContent) {
        try {
            formattedJson = JSON.stringify(JSON.parse(textContent), null, 2);
        } catch (e) {
            // Keep original text on error
        }
    }

    return (
        <Paper 
            style={{ 
                height: 'calc(100vh - 100px)', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                border: '1px solid var(--mantine-color-default-border)',
                position: 'relative'
            }} 
            p="md" 
            shadow="xs"
        >
            {/* Header */}
            <Group justify="space-between" mb="md" style={{ flexShrink: 0 }}>
                <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <ActionIcon variant="subtle" color="gray" onClick={() => setPreviewFileId(null)}>
                        <IconArrowLeft size={20} />
                    </ActionIcon>
                    <div style={{ minWidth: 0 }}>
                        <Text fw={700} size="lg" truncate>{file.name}</Text>
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }} truncate>{file.path}</Text>
                    </div>
                </Group>
                <Group>
                    <Button 
                        leftSection={<IconExternalLink size={16} />} 
                        variant="light" 
                        size="xs"
                        onClick={() => openFile(file.id)}
                    >
                        Open System
                    </Button>
                    <ActionIcon variant="subtle" color="gray" onClick={() => setPreviewFileId(null)}>
                        <IconX size={20} />
                    </ActionIcon>
                </Group>
            </Group>

            {/* Content Area */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />
                
                {error && (
                    <Center h="100%">
                        <Stack align="center">
                            <IconFileUnknown size={48} color="red" />
                            <Text c="red">Error loading preview</Text>
                            <Text size="sm" c="dimmed">{error}</Text>
                        </Stack>
                    </Center>
                )}

                {!loading && !error && (
                    <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
                        {isImage && (
                            <Center h="100%" style={{ minHeight: '300px' }}>
                                <Image src={fileUrl} fit="contain" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                            </Center>
                        )}

                        {isPdf && (
                            <iframe 
                                src={fileUrl} 
                                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} 
                                title="PDF Preview"
                            />
                        )}

                        {isAudio && (
                            <Center h="100%" style={{ flexDirection: 'column', gap: 16 }}>
                                <IconFileUnknown size={64} color="gray" />
                                <Text size="lg">{file.name}</Text>
                                <audio controls autoPlay src={fileUrl} style={{ width: '80%' }}>
                                    Your browser does not support the audio element.
                                </audio>
                            </Center>
                        )}

                        {isVideo && (
                            <Center h="100%">
                                <video 
                                    controls 
                                    autoPlay 
                                    src={fileUrl} 
                                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                                >
                                    Your browser does not support the video element.
                                </video>
                            </Center>
                        )}

                        {isCodeOrText && !isPdf && (
                            <div style={{ padding: '0.5rem', height: '100%' }}>
                                {isMarkdown ? (
                                    <div className="markdown-body" style={{ maxWidth: '800px', margin: '0 auto' }}>
                                        <ReactMarkdown>{textContent || ''}</ReactMarkdown>
                                    </div>
                                ) : isCsv ? (
                                    <div style={{ overflow: 'auto', maxHeight: '100%' }}>
                                        <Table striped highlightOnHover withTableBorder withColumnBorders>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    {csvColumns.map((key) => (
                                                        <Table.Th key={key} style={{ whiteSpace: 'nowrap' }}>{key}</Table.Th>
                                                    ))}
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {parsedCsv.map((row: any, i) => (
                                                    <Table.Tr key={i}>
                                                        {csvColumns.map((col) => (
                                                            <Table.Td key={col} style={{ whiteSpace: 'nowrap' }}>{row[col]}</Table.Td>
                                                        ))}
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </div>
                                ) : (
                                    <Code block style={{ whiteSpace: 'pre-wrap', minHeight: '100%' }}>
                                        {isJson ? formattedJson : textContent}
                                    </Code>
                                )}
                            </div>
                        )}

                        {!isImage && !isPdf && !isCodeOrText && !isAudio && !isVideo && (
                            <Center h="100%" style={{ flexDirection: 'column', gap: 16 }}>
                                <IconFileUnknown size={64} color="gray" />
                                <Text c="dimmed">No preview available for this file type.</Text>
                                <Button onClick={() => openFile(file.id)}>Open Externally</Button>
                            </Center>
                        )}
                    </div>
                )}
            </div>
        </Paper>
    );
}
