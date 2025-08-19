# neo client

This is the official cross-platform standalone and web UI for the Neo Data Governance solution.

## Architecture

The client is built using the framework Wails offering a electronjs-like webkit rending a nodejs frontend. The benefits of using Wails instead of electronjs are:

- advanced backend capabilities written in Go
- native Go function bindings to java components to be exported natively
- light weight (feature-like build on electronjs gives a 250MB binary compared to 10MB with Wails)

The frontend is using a React frontend in TypeScript with the [shadcn](https://ui.shadcn.com/) UI, Tailwind CSS, and Vite for dynamic dev environments and optimized build strategies.

> [!IMPORTANT]
> To add new component, make sure to be in the ```frontend``` folder!

## Live Development

To run in live development mode, run the following command:

```
wails dev
```

> [!NOTE]
> If you development environment is running Ubuntu linux, run the following command ```wails dev -tags webkit2_41```


in the project directory. This will run a Vite development server that will provide very fast hot reload of your frontend changes.
If you want to develop in a browser and have access to your Go methods, there is also a dev server that runs on
```http://localhost:34115```.

> [!IMPORTANT]
> The web UI is currently not saving state as there is not yet a remaping of the encrypted app_state.json to a coupled persistent volume.


## Building

To build a redistributable, production mode package, use:

For any non Ubuntu-based linux build host:
```wails build```

For any Ubuntu-based linux:
```wails build -tags webkit2_41```

For Windows platform:
```wails build -platform windows/amd64```

> ![!NOTE]
> MacOS binaries need to be built on a MacOS host due to xcode requirements and limited cross-architecture compilation compatibility

## Screenshots

![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-27-02.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-27-46.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-27-58.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-28-11.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-29-21.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-29-36.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-29-54.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-30-11.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-30-28.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-34-05.png)
![neo client screenshots](../../../images/Screenshot%20from%202025-08-19%2002-34-16.png)
