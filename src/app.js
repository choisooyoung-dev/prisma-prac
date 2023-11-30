import express from 'express';
import cookieParser from 'cookie-parser';
import env from 'dotenv';
import LogMiddleware from './middlewares/log.middleware.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middleware.js';
import expressSession from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import UsersRouter from './routes/users.router.js';
import PostsRouter from './routes/posts.router.js';
import CommentsRouter from './routes/comments.router.js';

env.config();

const app = express();
const PORT = 3018;

// MySQLStore를 Express-Session을 이용해 생성합니다.
const MySQLStore = expressMySQLSession(expressSession);
// MySQLStore를 이용해 세션 외부 스토리지를 선언합니다.
const sessionStore = new MySQLStore({
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    expiration: 1000 * 60 * 60 * 24, // 세션의 만료 기간을 1일로 설정합니다.
    createDatabaseTable: true, // 세션 테이블을 자동으로 생성합니다.
});

app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use(
    expressSession({
        secret: process.env.SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false, // 세션이 초기화되지 않았을 때 세션을 저장할 지 설정
        store: sessionStore, // 외부 세션 스토리지를 MySQLStore로 설정합니다.
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1일
        },
    }),
);
app.use('/api', [UsersRouter, PostsRouter, CommentsRouter]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
    console.log(PORT, '포트로 서버가 열렸어요!');
});

/**
 *
 * express-mysql-session 모듈의 가장 큰 문제점은
 * 세션 ID로 정보를 조회할 때마다 MySQL의 조회 쿼리를 매번 실행된다는 점
 *
 * JWT 쿠키를 이용하는 것이 하나의 방법이고
 * , 외부 세션 스토리지를 캐시 메모리 데이터베이스인 Redis로 변경하는 것도 가능한 해결책
 *
 *
 */
