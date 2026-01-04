# Reload, Restart or Redeploy

## context
Containerized application deployed on Kubernetes, manually or via GitOps, is composed of multiple objects from namespace, deployment, configmaps, secrets, services, and more. Most are static while other will be updated during the application lifecycle.   

Most of these object defintions are static while others will be updated with no to significant impact on the application, e.g.:   

* changing a service impacts the access but not the application.
* changing a data backend secret impacts the application with crashing, providing corrupted and/or outdated response.  
* changing a namespace or a deployment will require a redeployment of the application, meaning full disruption. 

How can we address these use cases?

## the application

The ```hello-path-go``` code mockup a web service with a third-party credential loop validation. If the flag value of ```my-secret``` is:   

* different than 4321 then it fails and retry after 10 secondes.  
* 4321 then it "validates" the credentials and start the webservice.  

### the code 

The sources are available [here](https://github.com/beezy-dev/verbose-couscous/tree/main/docs/sources/hello-path-go).
```Golang
--8<-- "sources/hello-path-go/main.go"
```

To follow this article, the repository can clone with the following command:
```
git clone https://github.com/beezy-dev/verbose-couscous
```

Output of the code with no parameters results in an incorrect ```mysecret``` value: 
```
go run docs/sources/hello-path-go/main.go
```

```                            
[hello-path-go-main] 2024/04/18 11:16:44 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 11:16:44 hello-path-go - a simple web service returning the URL path.
[hello-path-go-main] 2024/04/18 11:16:44 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 11:16:44 Web service initialization...
[hello-path-go-main] 2024/04/18 11:16:44 Note: mysecret value is 1234 while expected value is 4321.
[hello-path-go-main] 2024/04/18 11:16:44 FATAL: connection to remote service failed. Check mysecret parameter.
exit status 1
```

Output of the code with the correct value set for ```my-secret``` results in a working web service **with a security exposure**: 
```
go run docs/sources/hello-path-go/main.go --mysecret 4321
```
```
[hello-path-go-main] 2024/04/18 11:17:59 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 11:17:59 hello-path-go - a simple web service returning the URL path.
[hello-path-go-main] 2024/04/18 11:17:59 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 11:17:59 Web service initialization...
[hello-path-go-main] 2024/04/18 11:17:59 Connection to remote service: ok.
[hello-path-go-main] 2024/04/18 11:17:59 Web service accessible at 0.0.0.0:8080
``` 

### the build

The initial image has been built using ```podman``` with the following ```Containerfile```:
```INI
--8<-- "sources/hello-path-go/Containerfile"
```

To build the image, the following command can be executed:
```
podman build -t hello-path-go:v0.2 .
```

NOTE: at this stage, if you plan to use your build, the Deployment files will require some light modifications.

The image is hosted here ```https://github.com/beezy-dev/verbose-couscous/pkgs/container/hello-path-go```
The image tag is ```ghcr.io/beezy-dev/hello-path-go:v0.1``` for any deployment type.

### the deployment

#### no arg
The ```Deployment``` manfiest:
```YAML
--8<-- "sources/hello-path-go/Deployment.yaml"
```

To deploy ```hello-path-go```:
```
kubectl apply -f docs/sources/hello-path-go/Deployment.yaml
```

Checking the ```Deployment``` status:
```
kubectl get all 
```
```
NAME                                            READY   STATUS             RESTARTS      AGE
pod/hello-path-go-deployment-5c48979c88-wfndp   0/1     CrashLoopBackOff   1 (12s ago)   14s

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   12m

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/hello-path-go-deployment   0/1     1            0           14s

NAME                                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/hello-path-go-deployment-5c48979c88   1         1         0       14s
```

Checking the logs from the ```Pod```:
```
kubectl logs pod/hello-path-go-deployment-5c48979c88-fhl4w
```
```
[hello-path-go-main] 2024/04/18 18:52:08 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 18:52:08 hello-path-go - a simple web service returning the URL path.
[hello-path-go-main] 2024/04/18 18:52:08 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 18:52:08 Web service initialization...
[hello-path-go-main] 2024/04/18 18:52:08 Note: mysecret value is 1234 while expected value is 4321.
[hello-path-go-main] 2024/04/18 18:52:08 FATAL: connection to remote service failed. Check mysecret parameter.
```

The default secret doesn't allow the mockup connection resulting in a crash. Let's delete the ```Deployment```. 

```
kubectl delete -f docs/sources/hello-path-go/Deployment.yaml
```
```
deployment.apps "hello-path-go-deployment" deleted
```

#### mysecret arg

To confirm that our application works, the code includes a flag called ```mysecret``` setting the secret as an argument.   
**However, this is a clear security exposure that should never be considered for a production-grade environment.**


The ```Deployment``` manifest:
```YAML
--8<-- "sources/hello-path-go/Deployment-mysecret.yaml"
```

To deploy ```hello-path-go```:
```
kubectl apply -f docs/sources/hello-path-go/Deployment-mysecret.yaml
```

Checking the ```Deployment``` status:
```
kubectl get all 
```
```
NAME                                            READY   STATUS    RESTARTS   AGE
pod/hello-path-go-deployment-54fdf8687b-hq9lh   1/1     Running   0          13s

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   40m

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/hello-path-go-deployment   1/1     1            1           13s

NAME                                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/hello-path-go-deployment-54fdf8687b   1         1         1       13s
```

Checking the logs from the ```Pod```:
```
kubectl logs pod/hello-path-go-deployment-54fdf8687b-hq9lh
```
``` 
[hello-path-go-main] 2024/04/18 19:19:15 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 19:19:15 hello-path-go - a simple web service returning the URL path.
[hello-path-go-main] 2024/04/18 19:19:15 ------------------------------------------------------------
[hello-path-go-main] 2024/04/18 19:19:15 Web service initialization...
[hello-path-go-main] 2024/04/18 19:19:15 Connection to remote service: ok.
[hello-path-go-main] 2024/04/18 19:19:15 Web service accessible at 0.0.0.0:8080
```

The explicit secret export allow the mockup connection to succeed and start the web service.   
**However, this is a clear security exposure that should never be considered for a production-grade environment.**

Let's delete the ```Deployment```. 

```
kubectl delete -f docs/sources/hello-path-go/Deployment-mysecret.yam
```
```
deployment.apps "hello-path-go-deployment" deleted
```

## reload, restart, redeploy 

### redeploy

### restart

### reload


