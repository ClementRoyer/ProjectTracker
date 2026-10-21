<script lang="ts"></script>

<span class="agent-running" role="img" aria-label="An agent is working on this ticket"></span>

<style>
  @keyframes agent-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .agent-running {
    display: inline-block;
    flex: none;
    width: 12px;
    height: 12px;
    box-sizing: border-box;
    border: 2px solid var(--track);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: agent-spin 0.9s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .agent-running {
      animation-duration: 3s;
    }
  }
</style>
