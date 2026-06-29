# API Documentation

WrenAI BFF (Backend for Frontend) show toàn bộ API thông qua một endpoint GraphQL duy nhất.
Schema được document trực tiếp trong code — mọi type, field, query và mutation đều có description
hiển thị ngay trong Apollo Sandbox mà không cần tài liệu riêng.

---

## Truy cập GraphQL Playground

### Môi trường local (dev)

Khi chạy `wren-ui` trên máy local:

```
http://localhost:3000/api/graphql
```

### Môi trường SIT

```
http://<SIT_IP>:3000/api/graphql
```

> Thay `<SIT_IP>` bằng địa chỉ IP tĩnh của server SIT.

### Môi trường production

```
https://<deploy_url>/api/graphql
```

> Thay `<deploy_url>` bằng domain production thực tế.

**Lưu ý:** Xem phần bên dưới — Playground và introspection nên được tắt trên production.

---

## Cách sử dụng Playground

Truy cập URL trên bằng trình duyệt. Apollo Sandbox sẽ tự động load với:

- **Explorer**: duyệt toàn bộ schema, xem descriptions của từng type/field
- **Query editor**: viết và thực thi query/mutation trực tiếp
- **Schema tab**: xem SDL đầy đủ với tất cả descriptions

Không cần cài thêm công cụ nào.

---

## Tắt Playground và Introspection trên Production

Apollo Sandbox và introspection đang được bật cứng trong code. Khi deploy ra môi trường
production thực tế, cần tắt để tránh lộ schema cho người ngoài.

### Bước 1 — Cập nhật `src/pages/api/graphql.ts`

Tìm đoạn khởi tạo `ApolloServer` (khoảng dòng 101) và sửa hai chỗ:

**Trước:**
```ts
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';

// ...

const apolloServer: ApolloServer = new ApolloServer({
  // ...
  introspection: true, //process.env.NODE_ENV !== 'production',
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({
      embed: true,
    }),
  ],
});
```

**Sau:**
```ts
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageDisabled,
} from 'apollo-server-core';

// ...

const isProd = process.env.NODE_ENV === 'production';

const apolloServer: ApolloServer = new ApolloServer({
  // ...
  introspection: !isProd,
  plugins: [
    isProd
      ? ApolloServerPluginLandingPageDisabled()
      : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
});
```

### Bước 2 — Đảm bảo `NODE_ENV` được set đúng khi deploy

Trong `docker-compose.prod.yaml`, kiểm tra service `wren-ui` có biến môi trường:

```yaml
environment:
  - NODE_ENV=production
```

Sau khi set, truy cập `/api/graphql` trên production sẽ trả về `404` thay vì load Sandbox.
Introspection query cũng sẽ bị từ chối với lỗi `"Introspection is not allowed"`.

### Lưu ý

- Môi trường **dev** và **SIT** không cần tắt — Playground hữu ích cho việc test.
- Nếu có reverse proxy (nginx, Traefik), có thể block path `/api/graphql` ở tầng proxy
  thay vì sửa code — nhưng cách trên trong code rõ ràng và dễ kiểm soát hơn.
