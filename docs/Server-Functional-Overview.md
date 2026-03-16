# DeskThing Server Functional Overview
This section provides an overview of the server-side functions of the DeskThing library, detailing each function's purpose, usage, and examples.

## Core Event Handling
### on()
`on(event: IncomingEvent, callback: DeskthingListener): () => void`
Registers an event listener for a specific server-side event.

Parameters:

`event`: The event type to listen for.
`callback`: The function to execute when the event is emitted.
Returns: A function to remove the event listener.

Example:
```ts
const removeListener = DeskThing.on('start', () => {
   console.log('App has started.');
});
```

### off()
`off(event: IncomingEvent, callback: DeskthingListener)`
Removes a previously registered event listener.

Example:
```ts
DeskThing.off('start', startCallback);
```

### once()
`once(event: IncomingEvent, callback?: DeskthingListener): Promise<any>`
Registers a one-time listener for an event. The listener is removed automatically after the event is triggered.

Example:
```ts
await DeskThing.once('data');
```

## Data Handling
### send()
`send(event: OutgoingEvent, payload: any, request?: string): void`
Sends data to the client through the server.

Parameters:
`event`: The type of event to send.
`payload`: The data to send.
`request`: (Optional) Request identifier.

Example:
```ts
deskThing.send({ type: 'someDataType', payload: someData });
```

### getData()
`getData(): Promise<DataInterface | null>`
Fetches data from the server if not already retrieved. Handles caching and queued requests.

Example:
```ts
const data = await DeskThing.getData();
console.log('Fetched data:', data);
```

### saveData()
`saveData(data: DataInterface): void`
Merges new data with the existing data, updates settings, and sends the data to the server.

Example:
```ts
DeskThing.saveData({
    persistentData: 'this is a very special value'
});
```

## Settings Management
### getSettings()
`getSettings(): Promise<AppSettings | null>`
Retrieves the current settings from the server.

Example:
```ts
const settings = await DeskThing.getSettings();
console.log('Current settings:', settings);
```

### addSettings()
`addSettings(settings: AppSettings): void`
Adds or overwrites settings on the server.

Example:
```ts
DeskThing.addSettings({
   theme: {
     type: 'select',
     label: 'Theme',
     value: 'light',
     options: [
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
     ],
    },
});
```

## Action Management
### registerAction()
`registerAction(name: string, id: string, description: string, icon?: string): void`
Registers a new action on the server.

Example:
```ts
// Keep in mind, this may be outdated. Reference SettingsTest for actual implementation.
DeskThing.registerAction('Print Hello', 'printHello', 'Logs Hello to the console');
```

### removeAction()
`removeAction(id: string): void`
Removes an action from the server.

Example:
```ts
DeskThing.removeAction('printHello');
```

### registerKey()
`registerKey(id: string, description: string, modes: EventMode[], version: string): void`
Registers a key with the server for use in mappings.

Example:
```ts
// This may be outdated. Refer to SettingsTest for actual implementation
DeskThing.registerKey('customKey', 'A custom key', [EventMode.KeyDown], '1.0');
```

### removeKey()
`removeKey(id: string): void`
Removes a key from the server.

Example:
```ts
DeskThing.removeKey('customKey');
```

## Utility Functions
### sendLog()
`sendLog(log: string): void`
Sends a log message to the server.

Example:
```ts
// This will be changed later
DeskThing.sendLog('This is a log message.');
```

### sendWarning()
`sendWarning(warning: string): void`
Sends a warning message to the server.

Example:
```ts
// This will be changed later
DeskThing.sendWarning('Warning: Check your API keys.');
```

### sendError()
`sendError(message: string): void`
Sends an error message to the server.

Example:
```ts
// This will be changed later
DeskThing.sendError('An error occurred.');
````

### sendFatal()
`sendFatal(message: string): void`
Sends a fatal error message to the server.

Example:
```ts
// This will be changed later
DeskThing.sendFatal('Critical failure.');
```

### openURL()
`openUrl(url: string): void`
Requests the server to open a specified URL.

Example:
```ts
DeskThing.openUrl('https://example.com/');
```