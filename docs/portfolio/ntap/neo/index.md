# Neo UI Framework

This is the official cross-platform standalone and web UI for the Neo Data Governance solution.

## Architecture

The client is built using the framework Wails offering a electronjs-like webkit rending a nodejs frontend. The benefits of using Wails instead of electronjs are:

- advanced backend capabilities written in Go
- native Go function bindings to java components to be exported natively
- light weight (feature-like build on electronjs gives a 250MB binary compared to 10MB with Wails)

The frontend is using a React frontend in TypeScript with the [shadcn](https://ui.shadcn.com/) UI, Tailwind CSS, and Vite for dynamic dev environments and optimized build strategies.

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
