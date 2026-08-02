# Product DOM Ownership Matrix

| DOM zone | Current writers/handlers | Risk | Target owner |
|---|---|---|---|
| `#productRows` | `admin/admin.js`; `admin/product-purchase-price.js` listens for clicks | Multiple lifecycles respond to product selection | ProductRenderer |
| `#productEditor` / `#productLayout` | `admin/admin.js` | Monolith controls visibility, selection and editing | ProductRouter + ProductRenderer |
| `#productForm` | `admin/admin.js`; `admin/product-purchase-price.js` injects fields, observes mutations and adds submit listener | Two save lifecycles on one form | ProductFormFactory + ProductRenderer |
| Product media manager | `admin/admin.js` | Upload, ordering, preview and product state are coupled | ProductMediaRenderer |
| SEO controls and preview | `admin/admin.js` | Domain generation and DOM mutation are mixed | ProductService + ProductSeoRenderer |
| `#productGrid` | `shop/shop.js` | Complete grid redraw through `innerHTML`; local filters and listeners rebound | StorefrontProductRenderer |
| Product detail containers | `shop/product/product.js` | One script owns data loading, metadata, gallery, tabs and cart | ProductDetailRenderer and component factories |
| Dealstudio product picker | Combination Deals runtimes | Independent product projection and selection state | Bundle ProductPicker consuming Product projection |

## Hard target rules

1. One renderer per DOM zone.
2. Component factories own markup and form serialization.
3. Router owns editor/view activation.
4. ProductStore owns selected product and edit state.
5. No observer or interval may infer product selection from DOM mutations.
6. Save completion must emit explicit product events.