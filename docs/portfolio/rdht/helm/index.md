

In this context, two version of a helm chart for Hello Path have been created; version 0.1 and 0.2, the main difference being the ability to define parameters at the deployment time.
The repository where these charts are hosted will be added within the Helm Developer Catalogue at cluster scope level. Doing so allows access to the helm charts to be deployed in any projects which in our case means ```my-webapp-dev```, ```my-webapp-tst```, ```my-webapp-prd```.

***Within the Developer view***   
Create the Helm Chart repo within OpenShift  
![helm repo](../../../images/helm-repo-01.png)
![helm repo](../../../images/helm-repo-02.png)

Deploy the application using the Helm Chart catalogue
![helm deploy](../../../images/helm-deploy-01.png)
![helm deploy](../../../images/helm-deploy-02.png)
![helm deploy](../../../images/helm-deploy-03.png)
![helm deploy](../../../images/helm-deploy-04.png)

At this stage, the quota prevents the deployment of the application. Let's edit the limts/requests to carry on with the deployment.
![helm quota](../../../images/helm-deployed-quota-01.png)
![helm quota](../../../images/helm-deployed-quota-02.png)
![helm quota](../../../images/helm-deployed-quota-03.png)

***Within the Administrator view***    
Going back to the quota dashboard, we can see the resource consumption of our application.  
![helm quota](../../../images/helm-deployed-quota-04.png)

To address the quota enforcement, the Helm charts have been updated to fit this request with default value and can be adapted upon the actual needs.  
Note that if the values are over what the quota definition is, the deployment will be stale till addressed.

![helm resources](../../../images/helm-resources-01.png)  

Resulting in a smooth deployment  
![helm resources](../../../images/helm-resources-02.png)