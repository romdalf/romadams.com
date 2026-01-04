# Dialup

dialup is a prototype to explore the usage of FUSE to mount a read-only virtual filesystem from the ABACC API backend serving content directly from ChromaDB.

```
$ dialup
Usage: dialup -mount <mountpoint> [options]
Flags:
  -mount string
        Mount point directory (required)
  -workers int
        Maximum number of worker threads for parallel processing (default 5)
  -markdown
        Enable markdown rendering with glamour (default true)
  -api string
        API base URL (default "http://localhost:5000")
  -cache-ttl duration
        Cache TTL duration (default 5m0s)
```

When initalizing the virtual mount, an in-memory cache is created to recover basic attributes from the existing set of files:
```
$ ./dialup -mount ./test/ -workers 5
2025/08/02 12:51:38 INFO Starting with configuration workers=5 mountpoint=./test/ markdown=true api=http://localhost:5000 cache_ttl=5m0s
2025/08/02 12:51:38 INFO Pre-populating document cache...
2025/08/02 12:51:38 INFO Initializing document cache
2025/08/02 12:51:38 INFO Refreshing document cache
2025/08/02 12:51:40 INFO Document cache refreshed count=99
2025/08/02 12:51:40 INFO Starting content size preloading workers=5 documents=99
2025/08/02 12:51:40 INFO Mounting FUSE filesystem mountpoint=./test/
2025/08/02 12:51:40 INFO Press Ctrl+C to unmount and exit
2025/08/02 12:51:40 INFO FUSE filesystem mounted successfully mountpoint=./test/
2025/08/02 12:51:40 INFO ReadDirAll called url=http://localhost:5000/api/documents
2025/08/02 12:51:40 INFO ReadDirAll completed successfully entries=99
```

Retrieving files follow the same logics, a cache is warmed up with the first request:

- two runs in a row for a first fetch to the API endpoint and being cached and the second fetch retreived directly from cache:
```
$ time cat ./test/82.txt

real    0m10.319s
user    0m0.002s
sys     0m0.004s
$ time cat ./test/82.txt

real    0m0.018s
user    0m0.002s
sys     0m0.006s
```

Here is a comparaison querying directly the API endpoint:
```
$ time curl localhost:5000/api/document/orig_doc_82_txt

real    0m7.963s
user    0m0.007s
sys     0m0.009s
$ time curl localhost:5000/api/document/orig_doc_82_txt

real    0m2.115s
user    0m0.012s
sys     0m0.015s
```

The same mechanism is applied to every operations, like directory listing:
```
$ ls -al 10*
total 0
-r--r--r-- 1 root root 1024 Aug  2 13:09 101.txt
-r--r--r-- 1 root root 1024 Aug  2 13:09 102.txt
-r--r--r-- 1 root root 1024 Aug  2 13:09 103.txt
-r--r--r-- 1 root root 1024 Aug  2 13:09 104.txt
```
No file sizes are shown as attributes are fetch in backgroung and at first open:
```
$ ls -al 10*
-r--r--r-- 1 root root 688835 Aug  2 13:11 101.txt
-r--r--r-- 1 root root 334873 Aug  2 13:11 102.txt
-r--r--r-- 1 root root 419390 Aug  2 13:11 103.txt
-r--r--r-- 1 root root  32392 Aug  2 13:11 104.txt
```

Notes:
- the query from a the API endpoint create a "full_content" key where the recovered chunks are concatenated
- the API endpoint is also built with a caching mechanism to accelerate time to the next request

A sigterm is caught, a graceful shutdown including unmounting the virtual filesystem happens:
```
2025/08/02 12:51:40 INFO Received signal, shutting down gracefully signal=interrupt
2025/08/02 12:51:40 INFO Shutting down gracefully...
2025/08/02 12:51:40 INFO Unmounting filesystem...
2025/08/02 12:51:40 INFO FUSE filesystem service completed
2025/08/02 12:51:40 INFO Filesystem gracefully unmounted successfully
2025/08/02 12:51:40 INFO FUSE connection closed successfully
```