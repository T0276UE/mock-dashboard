package com.mockdashboard.backend.logging;

import jakarta.annotation.PreDestroy;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class ApiTransactionLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ApiTransactionLoggingFilter.class);

    private final Object writeLock = new Object();
    private final BufferedWriter writer;

    public ApiTransactionLoggingFilter() throws IOException {
        Path logDir = Path.of(System.getProperty("java.io.tmpdir"), "mock-dashboard-backend");
        Files.createDirectories(logDir);

        Path logFile = logDir.resolve("api-transactions.log");
        this.writer = Files.newBufferedWriter(
            logFile,
            StandardOpenOption.CREATE,
            StandardOpenOption.TRUNCATE_EXISTING,
            StandardOpenOption.WRITE
        );

        String startupBanner = "[startup] " + Instant.now() + " API transaction log initialized at " + logFile.toAbsolutePath();
        logger.info(startupBanner);
        writeToFile(startupBanner);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri == null || !uri.startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
        throws ServletException, IOException {

        String requestId = UUID.randomUUID().toString();
        long startNanos = System.nanoTime();

        ContentCachingRequestWrapper requestWrapper = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);

        Throwable failure = null;

        try {
            filterChain.doFilter(requestWrapper, responseWrapper);
        } catch (Throwable throwable) {
            failure = throwable;
            throw throwable;
        } finally {
            long elapsedMillis = (System.nanoTime() - startNanos) / 1_000_000;
            String line = buildLogLine(requestId, requestWrapper, responseWrapper, elapsedMillis, failure);

            if (failure == null) {
                logger.info(line);
            } else {
                logger.error(line, failure);
            }

            writeToFile(line);
            responseWrapper.copyBodyToResponse();
        }
    }

    private String buildLogLine(
        String requestId,
        HttpServletRequest request,
        ContentCachingResponseWrapper response,
        long elapsedMillis,
        Throwable failure
    ) {
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String query = request.getQueryString();
        String fullPath = query == null ? uri : (uri + "?" + query);

        Map<String, String> requestHeaders = extractRequestHeaders(request);
        Map<String, String> responseHeaders = extractResponseHeaders(response);
        String responsePreview = extractResponsePreview(response);

        int status = response.getStatus();
        String outcome = failure == null ? "OK" : "ERROR";
        String errorMessage = failure == null ? "" : " error=\"" + sanitize(failure.getMessage()) + "\"";

        return String.format(
            "requestId=%s ts=%s outcome=%s method=%s path=\"%s\" status=%d durationMs=%d requestHeaders=%s responseHeaders=%s responseBodyPreview=\"%s\"%s",
            requestId,
            Instant.now(),
            outcome,
            method,
            sanitize(fullPath),
            status,
            elapsedMillis,
            requestHeaders,
            responseHeaders,
            sanitize(responsePreview),
            errorMessage
        );
    }

    private String extractResponsePreview(ContentCachingResponseWrapper response) {
        byte[] responseBody = response.getContentAsByteArray();
        if (responseBody == null || responseBody.length == 0) {
            return "";
        }

        String body = new String(responseBody, StandardCharsets.UTF_8);
        if (body.length() <= 1024) {
            return body;
        }

        return body.substring(0, 1024) + "...[truncated]";
    }

    private Map<String, String> extractRequestHeaders(HttpServletRequest request) {
        Map<String, String> headers = new LinkedHashMap<>();
        request.getHeaderNames().asIterator().forEachRemaining((headerName) -> {
            String value = request.getHeader(headerName);
            headers.put(headerName, sanitizeHeaderValue(headerName, value));
        });
        return headers;
    }

    private Map<String, String> extractResponseHeaders(HttpServletResponse response) {
        Map<String, String> headers = new LinkedHashMap<>();
        for (String headerName : response.getHeaderNames()) {
            headers.put(headerName, sanitize(response.getHeader(headerName)));
        }
        return headers;
    }

    private String sanitizeHeaderValue(String headerName, String value) {
        if (headerName == null) return sanitize(value);

        String normalized = headerName.toLowerCase();
        if (normalized.contains("authorization") || normalized.contains("cookie") || normalized.contains("token")) {
            return "[REDACTED]";
        }

        return sanitize(value);
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.replace("\n", " ").replace("\r", " ").trim();
    }

    private void writeToFile(String line) {
        synchronized (writeLock) {
            try {
                writer.write(line);
                writer.newLine();
                writer.flush();
            } catch (IOException ioException) {
                logger.error("Failed to write API transaction log line", ioException);
            }
        }
    }

    @PreDestroy
    public void close() {
        synchronized (writeLock) {
            try {
                writer.flush();
                writer.close();
            } catch (IOException ignored) {
                // Best effort cleanup for dev-time logging.
            }
        }
    }
}