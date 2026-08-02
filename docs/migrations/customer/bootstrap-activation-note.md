# Customer Foundation Runtime Bootstrap

The Customer FDMP foundation is loaded parser-synchronously by `admin/auth-flow.js`, which is already positioned before `admin.js` and `interface.js` in `admin/index.html`.

Order:

1. `shared/deep-freeze.js`
2. `admin/customer-config.js`
3. `admin/customer-repository.js`
4. `admin/customer-service.js`
5. `admin/customer-store.js`
6. `admin/customer-v1-bridge.js`
7. legacy `admin.js`
8. `interface.js`

The temporary patch runner was not used for production activation.