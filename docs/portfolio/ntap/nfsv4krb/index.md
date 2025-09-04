# NetApp NFSv4 with Kerberos for containerized applications 

!!! warning     
    This document is a research document in a *Request for Comments* format, product of the NetApp Office of the CTO - Innovation & Solutions Group.

    Status: **draft** 
    Author(s):    
    - Rom Adams, Principal Software Engineer, Office of the CTO - NetApp Inc.
    Contributors:  
    - Elliott Ecton, Technical Marketing Engineer, Shared Platform Product Management - NetApp Inc.   
    - Erik Stjerna, Professional Services Consultant, Consulting - NetApp Inc.    
    - Johannes Wagner, Sr Solution Architect, Solution Engineering - NetApp Inc.    

    Copyright Notes     
    Copyright (c) 2025 NetApp Inc. and the persons identified as the document authors and contributors. All rights reserved. https://www.netapp.com/company/legal/copyright/ 

## Abstract
This RFC outlines the technical and operational challenges of implementing NFSv4 with Kerberos authentication in Kubernetes environments, specifically for containerized legacy applications. While cloud-native applications benefit from a decoupled architecture that simplifies Kerberos integration via CSI drivers like NetApp Trident, legacy applications present unique constraints due to their reliance on interactive shell environments and persistent user contexts. The ephemeral and immutable nature of containers complicates Kerberos ticket management, realm joining, and dynamic user provisioning, which are essential for secure access to NFSv4 shares.

## Introduction
In a Kubernetes environment, integrating NFSv4 with Kerberos on ONTAP using Trident, the NetApp Container Storage Interface (CSI), combines storage orchestration with secure, strong authentication and encryption. This approach requires coordinating the Kubernetes nodes, the CSI, and the Kerberos authentication to provision and mount volumes for pods dynamically.  

### NFSv4 with Kerberos
NFSv4 with Kerberos performs authentication, verifying a user's identity through a trusted third-party service like Active Directory or OpenLDAP. NFSv4 also supports Access Control Lists (ACLs), which **could** be enforced by the NFSv4 server to determine user permissions for file and directory operations after authentication has occurred.   

Kerberos is a client-server **authentication protocol** that uses tickets to allow nodes communicating over an insecure network to prove their identity to one another in a secure manner. When a client requests access to an NFSv4 share, the Kerberos client obtains a ticket from the Kerberos server, which is then used to authenticate the user to the NFSv4 server. The protocol can also provide additional capabilities like data encruption and data integrity improving the NFSv4 security posture. 

ACLs provide granular control over file and directory access to define **authorization**, allowing administrators to define who can read, write, or execute files and directories. 
The NFSv4 server could enforce ACLs. It checks the user's authenticated identity against the ACLs to grant or deny access to resources. When a new file or subdirectory is created within a directory with an ACL, it inherits the access control entries (ACEs) tagged for inheritance from the parent directory's ACL. 

When Kerberos is enabled, ONTAP NFSv4 enforces the authentication to verify the user identity. Once the authentication process is (successfully) done, the authorization process **could** enforce the ACLs too for authorization if enabled.

References:   
- ONTAP: https://docs.netapp.com/us-en/ontap/nfs-admin/enable-disable-nfsv4-acls-task.html 
- TR-4616 NFS Kerberos in ONTAP: https://www.netapp.com/pdf.html?item=/media/19384-tr-4616.pdf 

### Cloud-native application
A cloud-native application Pod, running without an interactive shell environment for users (no direct connection to a shell at the container level), will only require a valid Kerberos ticket to access the file system without encountering any 'permission denied' operations. This is a decoupled architecture where services and users are authorized or authenticated at the application layer while the filesystem is handled by the CSI at the node level:   
- A Kerberos ticket is negotiated at the node level by the CSI, verified by the NFS service, then the NFS export is mounted to the Pod.      
- Authorization of services and users using a framework like Oauth2 granting third-parties with limited access to their data without revealing credentials.    
- Authentication of services and users using a framework like OpenID Connect (OIDC) built on top of OAuth2 validating identity for authentiction with user information to process capabilities like Single Sign-On.  

### Containerized vintage application
Vintage applications are usually built with an interactive shell environment for one or multiple users, service accounts or regular users, to run, update, and access the application and interact with the application and filesystem. When integrating with Kerberos, all users interacting with the filesystem will require a valid Kerberos ticket to avoid any 'permission denied' operations. This model doesn't present a decoupled architecture and highly depend on the underlying operating systems to be set up for dynamic management of Kerberos tickets.
This represents a challenge when the application is containerized as a container image can not simply be join a realm or pre-user provisioning for security reasons. The ephemeral state and immutable nature of containers will also challenge any post-start configuration that will happen at the container image. 

While the authentication at the Pod level would most likely follow the same logic as for a cloud-native application, users accessing an interactive shell with filesystem will have to authenticate even if authorization has been disabled.  
Supporting a Kerberos will require to review the inner source of the application to address the dynamic management of Kerberos tickets to understand the different workflows address them via a modification of the deployment strategy up to a refactoring of the application to support the Kubernetes design constraints.  

## Solution Proposals

#### Main objectives
1. Establish an iterative path to decouple the different challenges and solution path.  
2. Establish a potential secure path to mount volumes using NFSv4 with Kerberos in Kubernetes using Trident.   
3. Enable both application runtimes and multi-user SSH workflows with per-user authorization.   

### Architectural components   
- Kubernetes Control Plane: Manages all cluster resources, including Persistent Volumes (PVs) and Persistent Volume Claims (PVCs).
- Trident CSI with NAS Driver: Interface between Kubernetes storage and the NFS server.
- Key Distribution Center (KDC): Issues tickets for authentication, could be an Active Directory, FreeIPA, ...
- ONTAP NFSv4: expose the data path service, the export configuration, and validate authentication.
- Secrets Store CSI Driver: Optional component to mount secrets from external stores into Pods.
- Client credentials: Either node machine creds (host/<node>) or per-user delegated creds; do not use the server’s nfs/<server> key on the client.
- Application Pod: Contains the application container and the storage volume.
- Kerberos Configuration on nodes (krb5.conf, nfs-utils, idmap): Required for node-side Kerberos.   
--- 

## Kerberos at the junction path with sys at volume level
With an ONTAP NFSv4 configured with Kerberos, all mounts will require a valid Kerberos ticket, and all entities, service and user, interacting at the filesystem level will also need a valid Kerberos ticket.  

This also applies, by design from a security standpoint, to export policies that somehow attempt to bypass the krb5 auth being set up at the junction path as follows:   
- The root junction path, ```/```, is configured with ```krb5``` to force Kerberos authentication at the node level.   
- All exports are configured with ```sys``` to allow a classic non-Kerberos authentication.     

The outcomes of such a configuration are:   
- The junction mount at the node level with a valid Kerberos authentication will succeed.   
- Only root and an authenticated user with Kerberos will have access to the mount of the junction path **AND** all volumes from this junction path.   

We can conclude that setting up the junction path with Kerberos will create a least privileged permission set for the whole tree, even if ```sys```  is defined for underlying volumes. Presenting the data path through NFSv4 with Kerberos authentication enforced a valid ticket for all services and users that would interact with the filesystem, even when a different authentication construct is forced at the export level, the Kerberos authentication takes precedence and enforces a least privileged permission set.


### Important constraints and clarifications   
- NFSv4 Kerberos negotiation happens on the node: the CSI Node plugin mounts the NFS volume in the host namespace, and the node’s kernel NFS client plus rpc.gssd perform GSSAPI. Pods do not run rpc.gssd for these mounts.    
- Configure Kerberos (krb5.conf, nfs-utils, rpc.gssd/gssproxy, idmap) on the nodes. Injecting krb5.conf into a Pod does not affect node-side Kerberos.   
- For a non-ONTAP solution, do not distribute the NFS server’s keytab (nfs/<server>@REALM) to clients/Pods. Use either:    
 - Node-scoped machine credentials (e.g., host/<node>@REALM) in /etc/krb5.keytab for system mounts; or    
 - Per-user delegated credentials, making the user’s ccache visible to the node’s rpc.gssd (e.g., KEYRING caches, hostPath ccaches with cruid, or gssproxy).   
- The Secrets Store CSI Driver pulls from external secret stores (optionally syncing to a Kubernetes Secret). It does not read Kubernetes Secrets directly. This improves the security posture if no Kubernetes KMS plugin is used to encrypt the ETCD data payloads for Secrets and ConfigMaps.   
- The NFS server validates Kerberos service tickets locally with its keytab; it typically does not call back to the KDC on each request.   
- If the NFS provisioner mounts the export to create subdirectories, it also needs Kerberos credentials on its node.   
- For NetApp Trident (provisioner csi.trident.netapp.io), Kerberos is enabled on the ONTAP SVM/backend (Kerberos interface, SVM realm join, export-policy rules). StorageClass parameters do not enable Kerberos; mountOptions with sec=krb5, krb5i, or krb5p only signal the client to request Kerberos.   
- In AD environments, ensure consistent UID/GID-to-principal mapping across nodes and the NFS server (idmap/nfsidmap with SSSD on nodes; appropriate name services on the server) so the same user maps to the duplicate IDs.   

### Kubernetes node configuration

Kerberos client defaults (KEYRING ccaches by UID so rpc.gssd can use delegated creds):
```INI
[libdefaults]
  default_realm = EXAMPLE.COM
  dns_lookup_kdc = true
  dns_lookup_realm = true
  rdns = false
  ticket_lifetime = 24h
  renew_lifetime = 7d
  forwardable = true
  default_ccache_name = KEYRING:persistent:%{uid}

[domain_realm]
  .example.com = EXAMPLE.COM
  example.com = EXAMPLE.COM
```

Ubuntu/Debian:
```bash
set -euxo pipefail
sudo apt-get update
sudo apt-get install -y nfs-common krb5-user
if grep -q '^NEED_GSSD' /etc/default/nfs-common; then
  sudo sed -i 's/^NEED_GSSD=.*/NEED_GSSD=yes/' /etc/default/nfs-common
else
  echo "NEED_GSSD=yes" | sudo tee -a /etc/default/nfs-common
fi
sudo install -m 0644 -o root -g root examples/node/krb5.conf /etc/krb5.conf
sudo systemctl enable --now nfs-client.target
sudo systemctl restart nfs-client.target
echo "Join the realm and ensure /etc/krb5.keytab contains host/<node>@REALM."
```

RHEL/CentOS/Fedora:
```bash
set -euxo pipefail
sudo dnf install -y nfs-utils krb5-workstation
sudo install -m 0644 -o root -g root examples/node/krb5.conf /etc/krb5.conf
sudo systemctl enable --now rpc-gssd
echo "Join the realm and ensure /etc/krb5.keytab contains host/<node>@REALM."
```
SUSE (SLES/openSUSE):
```bash
set -euxo pipefail
# Install NFS client + Kerberos client
sudo zypper refresh
sudo zypper install -y nfs-client krb5-client

# Install krb5.conf (uses KEYRING ccaches by UID if you keep the template above)
sudo install -m 0644 -o root -g root examples/node/krb5.conf /etc/krb5.conf

# Enable NFS client stack and Kerberos helpers
sudo systemctl enable --now nfs-client.target
sudo systemctl enable --now rpc-gssd.service
sudo systemctl enable --now nfs-idmapd.service
echo "Join the realm and ensure /etc/krb5.keytab contains host/<node>@REALM."
```

NFSv4 idmapping and AD integration:
```INI
# /etc/idmapd.conf
[General]
Domain = example.com
Local-Realms = EXAMPLE.COM

[Mapping]
Nobody-User = nobody
Nobody-Group = nogroup
```

- Install and configure SSSD so node NSS resolves AD users/groups; ensure nsswitch.conf includes “sss” for passwd/group.   
- Ensure the SVM/backend resolves the same identities consistently (LDAP/AD).   

### ONTAP SVM configuration checklist (NFSv4 + Kerberos)

Prerequisites:   
- ONTAP 9.x, SVM (e.g., vs1), DNS/NTP, network reachability, consistent identity source.   

Steps:   
1. Time & DNS   
```
cluster time-service ntp server create -server 10.0.0.10
vserver services name-service dns create -vserver vs1 -domains example.com -name-servers 10.0.0.10,10.0.0.11
vserver services name-service dns show -vserver vs1
```

2. NFSv4.1 and v4-id-domain   
```
vserver nfs create -vserver vs1 -v3 enabled -v4.1 enabled -v4.0 disabled -v4-id-domain example.com
vserver nfs show -vserver vs1
```

3. UNIX name services (LDAP example with AD)   
```
vserver services name-service ldap client create -vserver vs1 -client-config ad-ldap -servers 10.0.0.10,10.0.0.11 -schema MS-AD-BIS -base-dn "DC=example,DC=com" -bind-dn "CN=svc_ldap,OU=Service Accounts,DC=example,DC=com" -bind-password
vserver services name-service ldap create -vserver vs1 -client-config ad-ldap
vserver services name-service ns-switch modify -vserver vs1 -database passwd -sources files,ldap
vserver services name-service ns-switch modify -vserver vs1 -database group -sources files,ldap
vserver services name-service ns-switch show -vserver vs1
```

4. Kerberos realm   
```
vserver services kerberos realm create -vserver vs1 -realm EXAMPLE.COM -kdc-vendor Microsoft -kdc-ip 10.0.0.10 -kdc-port 88 -admin-server-ip 10.0.0.10 -admin-server-port 749
```
or
```
vserver services kerberos realm create -vserver vs1 -realm EXAMPLE.COM -kdc-vendor Microsoft
``` 
then
```
vserver services kerberos realm show -vserver vs1
```

5. Kerberos on NFS LIF(s)   
```
vserver nfs kerberos interface enable -vserver vs1 -lif lif_nfs1 -spn nfs/nfs01.example.com@EXAMPLE.COM
vserver nfs kerberos interface show -vserver vs1
``` 
Optional keytab upload:   
```
vserver services kerberos keytab add -vserver vs1 -spn nfs/nfs01.example.com@EXAMPLE.COM -keytab-from-uri ...
vserver services kerberos keytab show -vserver vs1
```

6. Export policy requiring Kerberos   
```
vserver export-policy create -vserver vs1 -policyname nfs_krb5p
vserver export-policy rule create -vserver vs1 -policyname nfs_krb5p -ruleindex 1 -clientmatch 10.0.0.0/16 -rorule krb5p -rwrule krb5p -superuser krb5p -anon 65534 -protocol nfs4
vserver export-policy rule show -vserver vs1 -policyname nfs_krb5p -instance
```

7. Volume and junction   
``` 
volume create -vserver vs1 -volume projects -aggregate aggr1 -size 500GB -security-style unix
volume mount -vserver vs1 -volume projects -junction-path /projects
volume modify -vserver vs1 -volume projects -policy nfs_krb5p
volume show -vserver vs1 -volume projects -fields junction-path,policy,security-style
```

8. Validate   
```
vserver nfs kerberos interface show -vserver vs1
vserver services kerberos show-spn -vserver vs1
vserver services name-service getxxbyyy getpwbyname -vserver vs1 -username alice
vserver services name-service getxxbyyy getgrbyname -vserver vs1 -groupname engineers
vserver export-policy check-access -vserver vs1 -volume projects -client-ip 10.0.5.25 -authentication-method krb5p -protocol nfs4 -access-type read-write
```

#### Considerations
!!! tip   
    - Time: ```cluster time-service ntp server show```   
    - Kerberos/AD: ```event log show -severity NOTICE..EMERGENCY -message-name secd.*```   
    - DNS: ```vserver services name-service dns check -vserver vs1```   
    - LDAP: ```vserver services name-service ldap check -vserver vs1 -client-config ad-ldap```   
    - Ensure SVM v4-id-domain matches client idmapd domain; clients mount with nfsvers=4.1 and sec=krb5[p|i].   

!!! note
    - CIFS is not required for NFS Kerberos.   
    - Enable Kerberos on each NFS data LIF and use its FQDN for mounts.    
    - Use “unix” security style for NFS-only; mixed/ntfs introduces ACL translation complexity.   

### BackendConfig, StorageClass, and PVC

Choose either ONTAP auth based on your security policies
#### Basic auth Secret
```YAML
apiVersion: v1
kind: Secret
metadata:
  name: ontap-auth
  namespace: trident
type: Opaque
stringData:
  username: admin
  password: REPLACE_WITH_PASSWORD
```

#### TLS Auth Secret
```YAML
apiVersion: v1
kind: Secret
metadata:
  name: ontap-auth
  namespace: trident
type: Opaque
stringData:
  clientPrivateKey: |
    -----BEGIN PRIVATE KEY-----
    ...your key...
    -----END PRIVATE KEY-----
  clientCertificate: |
    -----BEGIN CERTIFICATE-----
    ...your cert...
    -----END CERTIFICATE-----
  trustedCACertificate: |
    -----BEGIN CERTIFICATE-----
    ...ca cert...
    -----END CERTIFICATE-----
``` 
#### Trident BackendConfig:
```YAML
apiVersion: trident.netapp.io/v1
kind: TridentBackendConfig
metadata:
  name: ontap-nas-krb
  namespace: trident
spec:
  version: 1
  storageDriverName: ontap-nas
  managementLIF: 10.0.0.50                   # Cluster or SVM mgmt LIF
  dataLIF: nfs01.example.com                 # FQDN of Kerberos-enabled NFS data LIF (matches SPN)
  svm: vs1
  credentials:
    name: ontap-auth
      #useREST: true                         # To uncommment if TLS Auth Secret
      #clientCertificate: true                # To uncommment if TLS Auth Secret
  nfsMountOptions: nfsvers=4.1,sec=krb5p     # Mount options with matching krb5[p|i]
  defaults:
    exportPolicy: nfs_krb5p                  # Export policy requiring and matching krb5[p|i]
    unixPermissions: "0770"
    # Optional: qtreeParentFlexvol: trident_qtree_parent
  labels:
    app: nfs-krb
```

#### Considerations

!!! note "Reason for unixPermissions 0770"
    - Principle of least privilege: rwx for owner and group; no access for others. Even after Kerberos auth, “other” users on the realm can’t read/exec the PV root.   
    - Group-collaboration: lets a team (shared GID) fully use the volume while keeping everyone else out. Fits multi-user SSH where users share a POSIX group.   
    - Safe defaults with ONTAP “unix” security-style: applies at volume/qtree root at create time; you can further tighten/relax later or add NFSv4 ACLs.   
    - When to adjust   
      - Single-user volume: use "0700".   
      - Read-only for others: "0750".   
      - World-readable: "0755".   
      - Team-share with enforced group inheritance: prefer setgid on the directory (02770) so new files inherit the group.     
    - Ensure the PV root is owned by the correct UID/GID (match your app’s runAsUser/fsGroup or an init job chown). "0770" with root:root won’t help your users; the group must match the consumers.   


#### StorageClass
```YAML
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: trident-ontap-nfs-krb5p
provisioner: csi.trident.netapp.io
parameters:
  trident.netapp.io/backendType: "ontap-nas"
mountOptions:
  - nfsvers=4.1
  - sec=krb5p
  - proto=tcp
  - rsize=1048576
  - wsize=1048576
  - timeo=600
  - retrans=2
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
allowVolumeExpansion: true
```

#### PVC Example
```YAML
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-krb
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: trident-ontap-nfs-krb5p
  resources:
    requests:
      storage: 100Gi
```


## Basic implementation for an application runtime

This approach is a simplified implementation demonstrating NFSv4 with Kerberos for an application runtime in a Pod. 

```mermaid
sequenceDiagram
    participant User as User/Operator
    participant KubeAPI as Kube-API Server
    participant Provisioner as Trident Controller
    participant Kubelet as Kubelet
    participant NodePlugin as CSI NFS Node Plugin
    participant NFSserver as ONTAP NFSv4
    participant KDC as KDC
    participant AppPod as Application Pod

    User->>KubeAPI: 1. Creates PVC referencing StorageClass
    KubeAPI->>Provisioner: 2. New PVC
    Provisioner->>NFSserver: 3. Create volume
    Provisioner->>KubeAPI: 4. Create PV, bind PVC
    KubeAPI->>Kubelet: 5. Schedule Pod
    Kubelet->>NodePlugin: 6. NodePublishVolume (mount on node)
    Kubelet->>KDC: 7. Node rpc.gssd uses node keytab or per-user cache
    Kubelet->>NFSserver: 8. Kerberos negotiation (node-side)
    NFSserver->>Kubelet: 9. Mount success
    NodePlugin->>AppPod: 10. Bind-mount into Pod
    AppPod->>NFSserver: 11. File I/O
```

#### Application Deployment:
```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-krb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-krb
  template:
    metadata:
      labels:
        app: app-krb
    spec:
      containers:
        - name: app
          image: ubuntu:22.04
          command: ["/bin/bash","-lc","while true; do sleep 3600; done"]
          volumeMounts:
            - name: data
              mountPath: /mnt/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: data-krb
```

#### Considerations
!!! note   
    * No sidecar attached to the Pod to run ```kinit/krenew``` as the credentials are handled at the node's NFS mount level.   
    * A sidecar is to be used only for application-level Kerberos.   

## Basic implementation for an application runtime with application-level Kerberos

This implementation addresses the following requirements:   
- **Separation of concerns:** The sidecar handles all the complex Kerberos logic, allowing the application container to remain lightweight and focused on its core function.   
- **Security:** Only the sidecar needs access to the sensitive keytab file. The main application only ever sees the less-sensitive ticket cache.   
- **Automated renewal:** The sidecar ensures the Kerberos tickets are automatically renewed, preventing authentication failures for long-running applications without manual intervention.   
- **Simplified application development:** Developers don't need to embed Kerberos dependencies or logic into their application images. The sidecar pattern is managed at the platform level.   

On top of the previous diagram for the NFSv4 Kerberos, the following workflow is added to handle the application-level Kerberos authentication:

```mermaid
sequenceDiagram
    participant User as User/Operator
    participant KubeAPI as Kube-API Server
    participant AppPod as Application Pod (App + Kerberos Sidecar)
    participant KDC as KDC

    User->>KubeAPI: 1. Apply ConfigMap (krb5.conf) and Secret (service keytab)
    User->>KubeAPI: 2. Deploy Pod (App + Sidecar, shared ccache)

    Note over AppPod: emptyDir(/var/run/krb5cc/app.ccache) shared by both containers

    AppPod->>AppPod: 3. Sidecar starts
    AppPod->>KDC: 4. Sidecar kinit -kt service.keytab SERVICE_PRINCIPAL
    KDC-->>AppPod: 5. TGT issued to shared ccache
    AppPod->>AppPod: 6. Sidecar loop renews/re-kinit periodically

    AppPod->>KDC: 7. App requests service tickets as needed (GSSAPI)
    KDC-->>AppPod: 8. Service ticket via shared ccache
    AppPod->>ExternalSvc: 9. App calls Kerberos-protected service (HTTP, DB, etc.)
```

#### Kerberos client config ConfigMap
```YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: krb5-conf
data:
  krb5.conf: |
    [libdefaults]
      default_realm = EXAMPLE.COM
      dns_lookup_kdc = true
      dns_lookup_realm = true
      rdns = false
      ticket_lifetime = 24h
      renew_lifetime = 7d
      forwardable = true
      default_ccache_name = FILE:/var/run/krb5cc/app.ccache
    [domain_realm]
      .example.com = EXAMPLE.COM
      example.com = EXAMPLE.COM
```

#### Service keytab Secret
```YAML
apiVersion: v1
kind: Secret
metadata:
  name: app-service-keytab
type: Opaque
data:
  # base64-encode your binary keytab file
  krb5.keytab: BASE64_KEYTAB
``` 
> ![INFO]   
> Replace ```BASE64_KEYTAB``` with your base64 encoded keytab content

#### Dockerfile for the sidecar image
```Dockerfile
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends krb5-user ca-certificates && rm -rf /var/lib/apt/lists/*
# Lightweight entrypoint to kinit and periodically renew/re-kinit
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
``` 

Entrypoint script
```BASH
#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_PRINCIPAL:?set SERVICE_PRINCIPAL env var}"
: "${KRB5_KTNAME:=/etc/krb5.keytab}"
: "${KRB5_CONFIG:=/etc/krb5.conf}"
: "${KRB5CCNAME:=/var/run/krb5cc/app.ccache}"
export KRB5_KTNAME KRB5_CONFIG KRB5CCNAME

echo "Initial kinit for ${SERVICE_PRINCIPAL} using ${KRB5_KTNAME}"
kinit -kt "${KRB5_KTNAME}" "${SERVICE_PRINCIPAL}"

# Renew loop: re-kinit if cache not valid, else try renew
while true; do
  sleep 900
  if klist -s; then
    # Try to renew; ignore failure (may hit renew_lifetime)
    kinit -R || true
  else
    echo "Ticket missing/expired, re-kinit"
    kinit -kt "${KRB5_KTNAME}" "${SERVICE_PRINCIPAL}"
  fi
done
```

#### Application Deployment with Kerberos sidecar
```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-krb-sidecar
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-with-krb-sidecar
  template:
    metadata:
      labels:
        app: app-with-krb-sidecar
    spec:
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        fsGroupChangePolicy: OnRootMismatch
      containers:
        - name: app
          image: ubuntu:22.04
          command: ["/bin/bash","-lc","apt-get update && apt-get install -y curl && while true; do sleep 3600; done"]
          env:
            - name: KRB5_CONFIG
              value: /etc/krb5.conf
            - name: KRB5CCNAME
              value: /var/run/krb5cc/app.ccache
          volumeMounts:
            - name: krb5
              mountPath: /etc/krb5.conf
              subPath: krb5.conf
              readOnly: true
            - name: krb5cc
              mountPath: /var/run/krb5cc
        - name: krb-sidecar
          image: your-registry/kerberos-sidecar:latest
          imagePullPolicy: IfNotPresent
          env:
            - name: SERVICE_PRINCIPAL
              value: http/myapp.example.com@EXAMPLE.COM
            - name: KRB5_CONFIG
              value: /etc/krb5.conf
            - name: KRB5CCNAME
              value: /var/run/krb5cc/app.ccache
            - name: KRB5_KTNAME
              value: /etc/krb5.keytab
          volumeMounts:
            - name: krb5
              mountPath: /etc/krb5.conf
              subPath: krb5.conf
              readOnly: true
            - name: keytab
              mountPath: /etc/krb5.keytab
              subPath: krb5.keytab
              readOnly: true
            - name: krb5cc
              mountPath: /var/run/krb5cc
      volumes:
        - name: krb5
          configMap:
            name: krb5-conf
        - name: keytab
          secret:
            secretName: app-service-keytab
            items:
              - key: krb5.keytab
                path: krb5.keytab
        - name: krb5cc
          emptyDir:
            medium: Memory
```

## Basic implementation for a multi-user environment
When multiple users need SSH access to a pod and authenticate using GSSAPI (Kerberos), the architecture becomes more complex. Instead of a single sidecar managing a shared service keytab, the setup must handle individual user authentication and delegate credentials. The most secure and robust approach involves a secure SSH server inside the pod, configured for GSSAPI, with GSSAPIDelegateCredentials set to ```yes``` to forward user tickets for NFS access. 

Architectural components   
- Kubernetes Control Plane, CSI Driver, KDC, NFSv4 Server: These function as before.   
- SSH Server Container: A new container in the pod runs an SSH server (e.g., OpenSSH). It must be configured to use GSSAPI.   
- Kerberos Sidecar: The sidecar's role is now limited to providing a service keytab for the SSH server to use for its own host principal. It manages and renews this ticket, but individual user tickets are handled differently.
- Application Container: Runs the main application.   
- Shared Volumes: Multiple shared emptyDir volumes are used: one for the SSH service keytab and krb5.conf, and another for user-specific ticket caches.   
- Kerberos-Enabled Clients: Users' machines must have a Kerberos client (kinit) and an SSH client configured for GSSAPI.   
- Credential Delegation: Crucial for multi-user NFS access. When users connect via SSH with GSSAPI, they delegate their Kerberos tickets, which are then used for NFSv4 authentication.   
- sshd_config: The SSH server configuration file within the container must be set to allow GSSAPI authentication and credential delegation.   

This implementation addresses the following requirements for production-readiness for a multi-user interactive environment:   
-   **Dedicated SSH Server:** A container running an SSH server is required. Exposing it requires a Kubernetes Service.   
-   **Service Authentication:** The Kerberos Sidecar handles authenticating the SSH server itself using a `host/` principal, so the pod can listen and establish a secure connection.   
-   **User Authentication:** Individual users authenticate via SSH using their own credentials, a more secure approach than sharing a service keytab.   
-   **Credential Delegation:** The `GSSAPIDelegateCredentials` SSH option is essential. It allows the SSH server to place a copy of the user's TGT into a ticket cache that can be used by services inside the pod (like NFS).   
-   **Per-Session Ticket Cache:** The SSH server places the delegated user ticket into a cache that is scoped to the user's SSH session, providing proper isolation for multi-user access to NFS.   
-   **Implicit NFS Access:** Once authenticated and inside the pod, the user's commands will automatically use the delegated Kerberos ticket for NFSv4 operations, with permissions tied to their own Kerberos principal.   

```mermaid
sequenceDiagram
    participant User as User/Operator
    participant KubeAPI as Kube-API Server
    participant Kubelet as Kubelet (Node)
    participant NodePlugin as CSI NFS Node Plugin
    participant KDC as KDC/Active Directory
    participant NFSserver as ONTAP NFSv4
    participant SSHserver as SSH Server Container

    User->>KubeAPI: Create Pod with SSH Server
    KubeAPI->>Kubelet: Schedule Pod

    Kubelet->>NodePlugin: NodePublishVolume (sec=krb5p)
    Kubelet->>KDC: Node rpc.gssd uses node creds or delegated user creds
    NodePlugin->>SSHserver: Bind-mount into Pod

    User->>KDC: kinit on client
    User->>SSHserver: SSH with GSSAPIAuthentication + GSSAPIDelegateCredentials

    SSHserver->>User: Authenticated shell
    Note over SSHserver,Kubelet: Delegated creds must be visible to node rpc.gssd (KEYRING/file+cruid/gssproxy)

    User->>NFSserver: I/O triggers node rpc.gssd using delegated creds
    NFSserver->>NFSserver: Validate via keytab (no KDC round-trip)
    NFSserver->>User: Per-user authorization
```

#### Docker file for sshd container
```DOCKERFILE
FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssh-server krb5-user libpam-krb5 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/run/sshd
# Optional: fixed UID user for testing
RUN useradd -m -u 10001 alice
EXPOSE 22
CMD ["/usr/sbin/sshd","-D","-e"]
```

#### Kerberos client config and SSH ConfigMaps
```YAML
apiVersion: v1
kind: ConfigMap
metadata:
  name: krb5-conf
data:
  krb5.conf: |
    [libdefaults]
      default_realm = EXAMPLE.COM
      dns_lookup_kdc = true
      dns_lookup_realm = true
      rdns = false
      default_ccache_name = KEYRING:persistent:%{uid}
    [domain_realm]
      .example.com = EXAMPLE.COM
      example.com = EXAMPLE.COM
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: sshd-config
data:
  sshd_config: |
    Port 22
    Protocol 2
    UsePAM yes
    GSSAPIAuthentication yes
    GSSAPICleanupCredentials yes
    GSSAPIStrictAcceptorCheck yes
    GSSAPIDelegateCredentials yes
    GSSAPIKeyExchange yes
    PermitRootLogin prohibit-password
    PasswordAuthentication no
    ChallengeResponseAuthentication no
    PubkeyAuthentication yes
    Subsystem sftp /usr/lib/openssh/sftp-server
```

#### Application deployment with SSH container
```YAML
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ssh-krb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ssh-krb
  template:
    metadata:
      labels:
        app: ssh-krb
    spec:
      containers:
        - name: sshd
          image: your-registry/sshd-krb:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 22
          volumeMounts:
            - name: krb5
              mountPath: /etc/krb5.conf
              subPath: krb5.conf
              readOnly: true
            - name: keytab
              mountPath: /etc/krb5.keytab
              subPath: krb5.keytab
              readOnly: true
            - name: data
              mountPath: /mnt/data
            - name: sshd-config
              mountPath: /etc/ssh/sshd_config
              subPath: sshd_config
              readOnly: true
        - name: app
          image: ubuntu:22.04
          command: ["/bin/bash","-lc","while true; do sleep 3600; done"]
          volumeMounts:
            - name: data
              mountPath: /mnt/data
      volumes:
        - name: krb5
          configMap:
            name: krb5-conf
        - name: sshd-config
          configMap:
            name: sshd-config
        - name: keytab
          secret:
            secretName: ssh-host-keytab
            items:
              - key: krb5.keytab
                path: krb5.keytab
        - name: data
          persistentVolumeClaim:
            claimName: data-krb
---
apiVersion: v1
kind: Service
metadata:
  name: ssh-krb
spec:
  selector:
    app: ssh-krb
  ports:
    - name: ssh
      port: 22
      targetPort: 22
  type: ClusterIP
```

#### Testing SSH
```bash
# On your client after kinit
kubectl port-forward deploy/ssh-krb 2222:22 &
ssh -p 2222 -o GSSAPIAuthentication=yes -o GSSAPIDelegateCredentials=yes alice@127.0.0.1
klist
# Test I/O under /mnt/data
```

#### Considerations
!!! note  
    - RWO vs RWX: Two containers in the same Pod can share a single PVC with ReadWriteOnce (RWO). The volume is mounted once on the node, and both containers see the same mount. A ReadWriteOnce Pod is also fine for the sidecar-in-same-Pod pattern, but it will block any additional Pod from mounting the PVC. With the Trident NAS driver, choose RWX for flexibility and scalability.   
    - Security: The sidecar brings a host/<fqdn> Kerberos keytab into the app Pod. A separate SSH Pod sharing the PVC avoids placing that credential in the app Pod and reduces blast radius.   
    - Kerberos: sshd reads its host/<fqdn> key from /etc/krb5.keytab to accept GSS; it does not run kinit.   
    - Delegation: Users must enable GSSAPIDelegateCredentials. Use KEYRING:persistent:%{uid} and align UIDs so delegated user tickets are visible to node rpc.gssd for per-user NFS.   
    - NFS mount: The CSI Node plugin mounts on the node; Pod-side tickets do not alter the NFS mount unless the credential cache is visible to the node (KEYRING/file ccache + cruid, or gssproxy).    
    - Hardening: Apply NetworkPolicies, runAsUser/runAsGroup/fsGroup, drop capabilities, restrict sshd users/groups.    
    - Operations: Separate Pod lets you patch/rotate sshd and keytabs independently of the app and apply tighter PodSecurity/PSaC policies.    


## Top Takeaways
- Kerberos for NFSv4 is negotiated on the node by rpc.gssd; Pods don’t run Kerberos for these mounts.
- Do not distribute the NFS server’s keytab to Pods; use node machine creds or delegated user creds.
- Use KEYRING credential caches (or file ccaches + cruid) so rpc.gssd can use delegated SSH user tickets.
- StorageClass mountOptions (sec=krb5[p|i]) only signal the client; backend/SVM must be Kerberos-enabled.
- Align identity resolution (SSSD/idmapd on nodes and LDAP/AD on the SVM) for consistent UID/GID
