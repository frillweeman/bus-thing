# DeskThing Functional Overview
This section explains how the DeskThing client works, providing detailed descriptions of each function, examples of usage, and their purpose. This overview assumes familiarity with TypeScript and the basic structure of a DeskThing app.

## Core Event Handling
### `on(type: string, callback: EventCallback): () => void`
Registers an event listener for a specific event type.

Parameters:

`type`: The event type to listen for.
`callback`: The function to execute when the event is emitted.

Returns: A function to remove the event listener.

Example:
```ts
const removeListener = DeskThing.on('music', (data) => {
    console.log('Music event received:', data.payload);
});
```

### `off(type: string, callback: EventCallback)`
Removes a previously registered event listener.

Example:
```ts
DeskThing.off('music', musicCallback);
```

### `once(type: string, callback: EventCallback, request?: string): () => void`
Registers a one-time event listener that is automatically removed after the event triggers.

Example:
```ts
DeskThing.once('settings', (data) => {
    console.log('Settings received:', data.payload);
});
```

## Data Fetching
### `fetchData<t>(type: string, requestData: SocketData, request?: string): Promise<t | undefined>`
Sends a request and waits for a response. If the response is not received within 5 seconds, it times out.

Parameters:

`type`: The event type to listen for.
`requestData`: The data to send with the request.
`request`: (Optional) Filters responses by request type.
Returns: The payload of the response or `undefined` if it fails.

Example:
```ts
const userProfile = await DeskThing.fetchData('users', { type: 'get', request: 'profile', payload: { userId: '123' }, });
```

### `getMusic(): Promise<SongData | undefined>`
Fetches music data from the server.

Example:
```ts
const musicData = await DeskThing.getMusic();
if (musicData) console.log('Current song:', musicData.track_name);
```

### `getSettings(): Promise<AppSettings | undefined>`
Fetches application settings.

Example:
```ts
const settings = await DeskThing.getSettings();
if (settings) console.log('Volume:', settings.volume.value);
```

### `getApps(): Promise<App[] | undefined>`
Fetches the list of installed apps.

Example:
```ts
const apps = await DeskThing.getApps();
apps?.forEach(app => console.log('App:', app.name));
```

## Action Handling
### `triggerAction(action: ActionReference): Promise<void>`
Triggers a specific action.

Parameters:
`action`: The action to trigger, including its `id`, optional `value`, and `source`.

Example:
```ts
deskthing.triggerAction({ id: 'play', source: 'server' });
```

### `triggerKey(keyTrigger: KeyTrigger): Promise<void>`
Simulates triggering a key event, such as a button press or scroll.

Parameters:
`keyTrigger`: Includes the key, mode (e.g., `KeyDown`), and optional source.

Example:
```ts
DeskThing.triggerKey({ key: 'Enter', mode: EventMode.KeyDown });
```

## Utility Functions
### `send(data: SocketData)`
Sends a message from the client to the server.

Parameters:
`data`: Contains the `app`, `type`, `request`, and `payload` fields.
Example:
```ts DeskThing.send({ type: 'customEvent', payload: { foo: 'bar' } }); ```

`getKeyIcon(key: Key): Promise<string | undefined>`
Fetches the URL for a key's associated icon.

Example:
```ts
const iconUrl = await DeskThing.getKeyIcon(myKey);
```

### `getActionIcon(action: Action): Promise<string | undefined>`
Fetches the URL for an action's associated icon.

Example:
```ts
const iconUrl = await DeskThing.getActionIcon(myAction);
```

## Custom Timeout Handling
The `fetchData` function automatically handles timeouts to ensure responsive behavior.

Predefined Event Modes
Event modes include:

`KeyUp`
`KeyDown`
`ScrollUp`
`ScrollDown`
`ScrollLeft`
`ScrollRight`
`PressShort`
`PressLong`
These modes define how keys and buttons interact within the client.

Example:
```ts
const keyTrigger = { key: 'ArrowUp', mode: EventMode.ScrollUp };
DeskThing.triggerKey(keyTrigger);
```

This functional overview provides the tools to fully understand and utilize the `DeskThing` client. For conceptual use cases and abstract implementations, refer to the [ConceptualOverview](#).