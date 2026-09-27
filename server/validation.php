<?php
declare(strict_types=1);

function validate_board_document(array $body): void {
    foreach (['nodes', 'connections', 'groups', 'comments'] as $collection) {
        if (!isset($body[$collection]) || !is_array($body[$collection]) || !array_is_list($body[$collection])) {
            fail('A complete board document is required; existing data was not changed.', 422);
        }
    }

    $nodeIds = [];
    foreach ($body['nodes'] as $node) {
        if (!is_array($node) || !valid_id($node['id'] ?? null)) fail('Every node must have a valid unique ID.', 422);
        if (isset($nodeIds[$node['id']])) fail('Node IDs must be unique.', 422);
        $nodeIds[$node['id']] = true;
        if (!in_array($node['type'] ?? 'text', ['text', 'image', 'link', 'video', 'file', 'audio', 'swatch'], true)) fail('Unsupported node type.', 422);
        if (!valid_text($node['title'] ?? '', 255) || !valid_text($node['content'] ?? '', 100000)) fail('Node text is too long or invalid.', 422);
        foreach (['x', 'y', 'w', 'h'] as $field) {
            if (!isset($node[$field]) || !is_numeric($node[$field]) || !is_finite((float) $node[$field]) || abs((float) $node[$field]) > 1000000) fail('Node dimensions and positions are invalid.', 422);
        }
        if (isset($node['tags']) && (!is_array($node['tags']) || count($node['tags']) > 50)) fail('Node tags are invalid.', 422);
    }

    foreach ($body['connections'] as $edge) {
        if (!is_array($edge) || !valid_id($edge['id'] ?? null) || !valid_id($edge['from'] ?? null) || !valid_id($edge['to'] ?? null)) fail('Connections must have valid IDs.', 422);
        if (!isset($nodeIds[$edge['from']], $nodeIds[$edge['to']])) fail('Connections must refer to existing nodes.', 422);
        if (!valid_text($edge['label'] ?? '', 255)) fail('Connection labels are invalid.', 422);
    }

    foreach ($body['groups'] as $group) {
        if (!is_array($group) || !valid_id($group['id'] ?? null) || !valid_text($group['name'] ?? '', 255)) fail('Groups are invalid.', 422);
    }
    foreach ($body['comments'] as $comment) {
        if (!is_array($comment) || !valid_id($comment['id'] ?? null) || !valid_text($comment['author'] ?? '', 255) || !valid_text($comment['content'] ?? '', 10000)) fail('Comments are invalid.', 422);
        if (!empty($comment['nodeId']) && !isset($nodeIds[$comment['nodeId']])) fail('Comments must refer to existing nodes.', 422);
    }
}

function valid_id(mixed $value): bool { return is_string($value) && $value !== '' && strlen($value) <= 64; }
function valid_text(mixed $value, int $max): bool { return is_string($value) && strlen($value) <= $max; }
